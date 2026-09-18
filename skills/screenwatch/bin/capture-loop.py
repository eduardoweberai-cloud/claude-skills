"""
Screenwatch capture daemon (Windows, Python).

Python em vez de PowerShell: um loop de CopyFromScreen em PowerShell costuma ser
barrado pelo AMSI do Windows Defender. O mss captura cada monitor separadamente.

A cada 5s, quando ha input recente:
  - registra 1 linha de metadata (app, titulo da janela) no log.jsonl
  - salva 1 JPEG ~1568px por MONITOR quando muda de app/janela, ou a cada 30s parado
Apaga pastas de dias com mais de 30 dias. Nunca deixa o loop morrer (erros -> daemon.log).

Privacidade:
  - <base>/PAUSE existe            -> nao captura nada
  - <base>/exclude.txt (1 termo por linha) -> se app ou titulo contem o termo,
    nao salva imagem e grava o titulo como "[excluído]"
Tudo fica local. Nada e enviado para fora por este script.
"""
import os
import time
import json
import ctypes
from ctypes import wintypes
from datetime import datetime, timedelta

import mss
import psutil
from PIL import Image

_MSS = getattr(mss, "MSS", None) or mss.mss  # mss 10+ renomeou mss.mss para mss.MSS

BASE          = os.environ.get("SCREENWATCH_DIR") or os.path.join(os.environ["USERPROFILE"], "screenwatch")
DAYS_DIR      = os.path.join(BASE, "days")
DAEMON_LOG    = os.path.join(BASE, "daemon.log")
PAUSE_FILE    = os.path.join(BASE, "PAUSE")
EXCLUDE_FILE  = os.path.join(BASE, "exclude.txt")
INTERVAL      = 5      # segundos entre ticks
IDLE_SKIP     = 90     # sem input por >= isto -> nao captura
DEDUPE_TICKS  = 6      # parado na mesma janela: salva imagem a cada N ticks (6*5s=30s)
RETAIN_DAYS   = 30     # apaga frames mais antigos que isto
WIDTH         = 1568   # largura maxima util p/ visao de IA
JPEG_QUALITY  = 55

user32   = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

SM_CMONITORS = 80  # numero de monitores ativos no momento


def monitor_count():
    """Quantas telas estao conectadas AGORA (barato). Muda quando o usuario
    liga/desliga um monitor -> gatilho para re-enumerar o mss."""
    return user32.GetSystemMetrics(SM_CMONITORS)


class LASTINPUTINFO(ctypes.Structure):
    _fields_ = [("cbSize", wintypes.UINT), ("dwTime", wintypes.DWORD)]


def idle_seconds():
    lii = LASTINPUTINFO()
    lii.cbSize = ctypes.sizeof(lii)
    user32.GetLastInputInfo(ctypes.byref(lii))
    return (kernel32.GetTickCount() - lii.dwTime) / 1000.0


def foreground():
    """(app, window_title) da janela em foco. Unicode (preserva acentos)."""
    hwnd = user32.GetForegroundWindow()
    length = user32.GetWindowTextLengthW(hwnd)
    buff = ctypes.create_unicode_buffer(length + 1)
    user32.GetWindowTextW(hwnd, buff, length + 1)
    title = buff.value
    pid = wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    app = ""
    try:
        name = psutil.Process(pid.value).name()
        app = name[:-4] if name.lower().endswith(".exe") else name
    except Exception:
        pass
    return app, title


_excl_cache = {"mtime": None, "terms": []}


def exclude_terms():
    """Termos de exclude.txt (minusculos). Recarrega so quando o arquivo muda."""
    try:
        mtime = os.path.getmtime(EXCLUDE_FILE)
    except OSError:
        return []
    if mtime != _excl_cache["mtime"]:
        try:
            with open(EXCLUDE_FILE, encoding="utf-8-sig") as f:
                terms = [l.strip().lower() for l in f if l.strip() and not l.startswith("#")]
        except Exception:
            terms = []
        _excl_cache.update(mtime=mtime, terms=terms)
    return _excl_cache["terms"]


def is_excluded(app, window):
    hay = f"{app} {window}".lower()
    return any(t in hay for t in exclude_terms())


def log_error(msg):
    try:
        with open(DAEMON_LOG, "a", encoding="utf-8") as f:
            f.write(f"{datetime.now().isoformat()} {msg}\n")
    except Exception:
        pass


def prune_old():
    cutoff = datetime.now() - timedelta(days=RETAIN_DAYS)
    if not os.path.isdir(DAYS_DIR):
        return
    for name in os.listdir(DAYS_DIR):
        p = os.path.join(DAYS_DIR, name)
        try:
            if os.path.isdir(p) and datetime.fromtimestamp(os.path.getmtime(p)) < cutoff:
                import shutil
                shutil.rmtree(p, ignore_errors=True)
        except Exception as e:
            log_error(f"prune {name}: {e}")


def save_monitors(sct, dir_path, ts):
    """Captura cada tela real (indices 1..N do mss) num JPEG separado. Retorna lista de nomes."""
    saved = []
    for i, mon in enumerate(sct.monitors[1:], start=1):
        try:
            shot = sct.grab(mon)
            img = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")
            if img.width > WIDTH:
                h = round(img.height * WIDTH / img.width)
                img = img.resize((WIDTH, h), Image.LANCZOS)
            name = f"{ts}-mon{i}.jpg"
            img.save(os.path.join(dir_path, name), "JPEG", quality=JPEG_QUALITY)
            saved.append(name)
        except Exception as e:
            log_error(f"save mon{i}: {e}")
    return saved


def main():
    os.makedirs(DAYS_DIR, exist_ok=True)
    last_state = None
    tick = 0
    last_prune_day = None

    sct = _MSS()
    last_count = monitor_count()
    log_error(f"daemon started ({last_count} screen(s))")

    try:
        while True:
            time.sleep(INTERVAL)
            try:
                # Layout de telas mudou? (4a tela ligada, so o notebook, etc.)
                # Recria o mss para re-enumerar os monitores atuais. Zero intervencao.
                count = monitor_count()
                if count != last_count:
                    try:
                        sct.close()
                    except Exception:
                        pass
                    sct = _MSS()
                    log_error(f"monitor layout changed: {last_count} -> {count} screen(s)")
                    last_count = count

                if os.path.exists(PAUSE_FILE) or idle_seconds() >= IDLE_SKIP:
                    continue

                now = datetime.now()
                day = now.strftime("%Y-%m-%d")
                ts = now.strftime("%H-%M-%S")
                dir_path = os.path.join(DAYS_DIR, day)
                os.makedirs(dir_path, exist_ok=True)

                app, window = foreground()
                excluded = is_excluded(app, window)
                if excluded:
                    window = "[excluído]"
                state = f"{app}|{window}"

                imgs = []
                if not excluded and (state != last_state or tick % DEDUPE_TICKS == 0):
                    imgs = save_monitors(sct, dir_path, ts)
                last_state = state
                tick += 1

                line = {
                    "t": ts,
                    "epoch": int(now.timestamp()),
                    "app": app,
                    "window": window,
                    "url": "",
                    "img": bool(imgs),
                    "screens": count,
                    "monitors": imgs,
                }
                with open(os.path.join(dir_path, "log.jsonl"), "a", encoding="utf-8") as f:
                    f.write(json.dumps(line, ensure_ascii=False) + "\n")

                if day != last_prune_day:
                    prune_old()
                    last_prune_day = day
            except Exception as e:
                log_error(f"loop: {e}")
    finally:
        try:
            sct.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()
