#!/usr/bin/env python3
"""
Excalidraw engine for Obsidian. Emits `.excalidraw.md` (or raw `.excalidraw`) files
that open directly in the Obsidian Excalidraw plugin. NO API, NO network: everything
is computed locally and written to disk. This is the local-file sibling of the
a Miro mind-map builder (same builders, same layout math, different emitter).

Subcommands:
  build    Mindmap from a recursive tree JSON. Tidy-tree layout (x by depth, leaves
           stacked, parents centered). Root -> branches -> leaves, arrows between them.
  flow     Auto-laid-out FLOWCHART from {nodes, edges} (no manual x/y): topological
           ranking + per-type node styling (start/end/process/decision/io/subprocess)
           + labelled arrows. `--layers` renders horizontal swimlanes by node.lane.
  create   Free-form objects from a spec: rectangle/ellipse/diamond/text/frame + arrows
           (connectors) between them by ref. YOU set x/y (Excalidraw y grows downward).

Output:
  --out <path>   Target file. If it ends in .excalidraw it is written as raw JSON;
                 otherwise .excalidraw.md (Obsidian-native, uncompressed) is written.
                 Default folder: $EXCALIDRAW_DIR, else ./excalidraw (see DEFAULT_DIR).
  --append       Merge into an existing target file: parse its elements, drop new
                 content BELOW them (like miro's safe_below_y), rewrite the file.

Why this script exists (Excalidraw gotchas baked in):
  - Bound text: a shape "contains" text only if the shape lists {type:text,id} in its
    boundElements AND the text has containerId=<shape id>. Both sides required.
  - Bound arrows: startBinding/endBinding reference element ids; the shapes must also
    list the arrow in their boundElements. Endpoints are clipped to each shape's border
    so arrows do not stab into boxes on first open.
  - Excalidraw has no parallelogram/pill/card shapes: io->rectangle, start/end->ellipse,
    decision->diamond, card->rectangle+bold title.
  - fractional `index` must be strictly ordered strings; zero-padded keys are safe.
  - Windows: this pipeline is UTF-8 end-to-end (ensure_ascii=False + utf-8 write).
    Author source text WITH PT-BR accents and c-cedilha; NEVER transliterate to
    ASCII "to be safe" (nao/voce/adoracao) - that is a bug here, not a safeguard.
    write_doc() runs a sanity check and warns loudly if it sees unaccented PT text.
    Run with PYTHONUTF8=1 -X utf8.
"""
import argparse, json, os, sys, time, random, math, re

DEFAULT_DIR = os.environ.get("EXCALIDRAW_DIR") or os.path.join(os.getcwd(), "excalidraw")
FONT_HAND = 5   # Excalifont (hand-drawn)
FONT_NORMAL = 5
LINE_HEIGHT = 1.25
PLUGIN_SRC = "https://github.com/zsviczian/obsidian-excalidraw-plugin/releases/tag2.24.2"

# ---- id / index generation -------------------------------------------------
_ALPHA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

def _rid(n=16):
    return "".join(random.choice(_ALPHA + "_-") for _ in range(n))

def _seed():
    return random.randint(1, 2_000_000_000)

def _now():
    return int(time.time() * 1000)

class Idx:
    """Monotonic, lexicographically-ordered fractional index generator."""
    def __init__(self):
        self.i = 0
    def next(self):
        s = f"a{self.i:05d}"
        self.i += 1
        return s

# ---- element factory -------------------------------------------------------
def _base(el_type, x, y, w, h, idx, **over):
    el = {
        "id": over.pop("id", _rid()),
        "type": el_type,
        "x": round(x, 2), "y": round(y, 2),
        "width": round(w, 2), "height": round(h, 2),
        "angle": 0,
        "strokeColor": over.pop("strokeColor", "#1e1e1e"),
        "backgroundColor": over.pop("backgroundColor", "transparent"),
        "fillStyle": over.pop("fillStyle", "solid"),
        "strokeWidth": over.pop("strokeWidth", 2),
        "strokeStyle": over.pop("strokeStyle", "solid"),
        "roughness": over.pop("roughness", 1),
        "opacity": 100,
        "groupIds": [],
        "frameId": over.pop("frameId", None),
        "index": idx.next(),
        "roundness": over.pop("roundness", None),
        "seed": _seed(),
        "version": 1,
        "versionNonce": _seed(),
        "isDeleted": False,
        "boundElements": over.pop("boundElements", []),
        "updated": _now(),
        "link": None,
        "locked": False,
    }
    el.update(over)
    return el

def _text_dims(text, font_size):
    lines = text.split("\n")
    w = max((len(l) for l in lines), default=1) * font_size * 0.58 + 8
    h = len(lines) * font_size * LINE_HEIGHT
    return w, h

def text_element(text, x, y, idx, font_size=20, color="#1e1e1e",
                 align="left", container_id=None, w=None, h=None):
    tw, th = _text_dims(text, font_size)
    w = tw if w is None else w
    h = th if h is None else h
    el = _base("text", x, y, w, h, idx,
               strokeColor=color, roundness=None)
    el.update({
        "text": text, "originalText": text, "rawText": text,
        "fontSize": font_size, "fontFamily": FONT_HAND,
        "textAlign": align, "verticalAlign": "top" if not container_id else "middle",
        "containerId": container_id, "autoResize": True,
        "lineHeight": LINE_HEIGHT,
    })
    return el

def shaped_box(shape, x, y, w, h, text, idx, elements,
               fill="#ffffff", stroke="#1e1e1e", text_color="#1e1e1e",
               font_size=20, rounded=True, stroke_style="solid"):
    """A rectangle/ellipse/diamond with centered bound text. Returns the box element."""
    box = _base(shape, x, y, w, h, idx,
                strokeColor=stroke, backgroundColor=fill,
                strokeStyle=stroke_style,
                roundness={"type": 3} if (rounded and shape == "rectangle") else None)
    elements.append(box)
    if text:
        tw, th = _text_dims(text, font_size)
        tx = x + (w - min(tw, w)) / 2
        ty = y + (h - th) / 2
        txt = text_element(text, tx, ty, idx, font_size=font_size,
                           color=text_color, align="center", container_id=box["id"],
                           w=min(tw, w - 10), h=th)
        elements.append(txt)
        box["boundElements"] = [{"type": "text", "id": txt["id"]}]
    return box

def frame_element(title, x, y, w, h, idx):
    fr = _base("frame", x, y, w, h, idx, roundness=None)
    fr["name"] = title
    return fr

def _center(el):
    return el["x"] + el["width"] / 2, el["y"] + el["height"] / 2

def _edge_point(el, tx, ty):
    """Point on el's border along the line from its center toward (tx, ty)."""
    cx, cy = _center(el)
    dx, dy = tx - cx, ty - cy
    if dx == 0 and dy == 0:
        return cx, cy
    hw, hh = el["width"] / 2, el["height"] / 2
    sx = hw / abs(dx) if dx != 0 else math.inf
    sy = hh / abs(dy) if dy != 0 else math.inf
    s = min(sx, sy)
    return cx + dx * s, cy + dy * s

def arrow_element(a, z, idx, elements, label=None, color="#1e1e1e",
                  font_size=16):
    """Bound arrow from element a to element z, clipped to their borders."""
    acx, acy = _center(a)
    zcx, zcy = _center(z)
    sx, sy = _edge_point(a, zcx, zcy)
    ex, ey = _edge_point(z, acx, acy)
    ar = _base("arrow", sx, sy, abs(ex - sx), abs(ey - sy), idx,
               strokeColor=color, roundness={"type": 2})
    ar.update({
        "points": [[0, 0], [round(ex - sx, 2), round(ey - sy, 2)]],
        "startBinding": {"elementId": a["id"], "focus": 0, "gap": 4},
        "endBinding": {"elementId": z["id"], "focus": 0, "gap": 4},
        "startArrowhead": None, "endArrowhead": "arrow",
        "elbowed": False,
    })
    elements.append(ar)
    a.setdefault("boundElements", []).append({"id": ar["id"], "type": "arrow"})
    z.setdefault("boundElements", []).append({"id": ar["id"], "type": "arrow"})
    if label:
        lx = (sx + ex) / 2
        ly = (sy + ey) / 2 - font_size
        elements.append(text_element(label, lx, ly, idx, font_size=font_size,
                                     color=color, align="center"))
    return ar

# ---- document assembly & writing ------------------------------------------
def new_doc():
    return {"type": "excalidraw", "version": 2, "source": PLUGIN_SRC,
            "elements": [], "appState": {"gridSize": 20, "viewBackgroundColor": "#ffffff"},
            "files": {}}

def _existing_elements(path):
    """Parse elements out of an existing .excalidraw or .excalidraw.md file."""
    if not os.path.exists(path):
        return []
    raw = open(path, encoding="utf-8").read()
    if path.endswith(".md"):
        # find the ```json ... ``` block under ## Drawing
        i = raw.find("## Drawing")
        block = raw[i:] if i >= 0 else raw
        start = block.find("```")
        start = block.find("\n", start) + 1
        end = block.find("```", start)
        data = json.loads(block[start:end])
    else:
        data = json.loads(raw)
    return data.get("elements", [])

def _bottom_of(elements):
    ys = [e["y"] + e.get("height", 0) for e in elements if not e.get("isDeleted")]
    return max(ys) if ys else 0

# ---- PT-BR accent sanity check (catches ASCII-transliterated text) --------
_ACCENT_CHARS = "áàâãéêíîóôõúûüçñÁÀÂÃÉÊÍÎÓÔÕÚÛÜÇÑ"
# words that are essentially ALWAYS accented in PT-BR and are NOT common English
# words; seeing them in bare ASCII is a strong signal of transliteration.
_PT_ALWAYS_ACCENTED = {
    "nao", "voce", "voces", "tambem", "entao", "porem", "alem", "apos",
    "atraves", "ninguem", "alguem", "portugues", "orgao", "coracao", "oracao",
    "adoracao", "informacao", "iteracao", "compulsao", "decisao", "versao",
    "reuniao", "visao", "manha", "raizes", "espirito", "relogio", "regua",
    "secundario", "estrategico", "biblico", "biblicos", "comentarios",
    "dobradica", "dizimo", "sabado", "proxima", "proximo", "sinergia",
}
# small set of PT function words used only to decide "this text is Portuguese".
_PT_MARKERS = {"de", "que", "com", "para", "uma", "nao", "dos", "das", "como",
               "por", "sem", "mais", "seu", "sua", "meu", "minha", "ele", "ela"}

def _accent_sanity_check(elements):
    """Warn (non-blocking) if the new text looks like PT-BR stripped of accents."""
    blob = " ".join(e.get("text", "") for e in elements if e.get("type") == "text")
    words = re.findall(r"[0-9A-Za-zÀ-ÿ]+", blob.lower())
    if not words:
        return
    has_accent = any(ch in _ACCENT_CHARS for ch in blob)
    hits = sorted({w for w in words if w in _PT_ALWAYS_ACCENTED})
    looks_pt = len({w for w in words if w in _PT_MARKERS}) >= 2 and sum(len(w) for w in words) >= 30
    if hits or (looks_pt and not has_accent):
        bar = "=" * 70
        print(bar, file=sys.stderr)
        print("  AVISO UTF-8: o texto parece PT-BR SEM ACENTOS (transliterado p/ ASCII).", file=sys.stderr)
        print("  Este pipeline e UTF-8 seguro: acentos e c-cedilha sao OBRIGATORIOS.", file=sys.stderr)
        print("  Reescreva o JSON de origem com acentuacao correta e gere de novo.", file=sys.stderr)
        print("  NAO despache ASCII 'por seguranca' - aqui isso e um bug, nao protecao.", file=sys.stderr)
        if hits:
            print(f"  Palavras suspeitas: {', '.join(hits[:15])}", file=sys.stderr)
        print(bar, file=sys.stderr)

def write_doc(path, elements, append=False):
    _accent_sanity_check(elements)
    doc = new_doc()
    prior = _existing_elements(path) if append else []
    doc["elements"] = prior + elements
    payload = json.dumps(doc, ensure_ascii=False, indent="\t")
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    if path.endswith(".md"):
        texts = [e for e in elements if e["type"] == "text" and not e.get("containerId")]
        bound = [e for e in elements if e["type"] == "text" and e.get("containerId")]
        te_lines = "\n".join(f'{e["text"]} ^{e["id"]}' for e in (texts + bound))
        md = (
            "---\n\n"
            "excalidraw-plugin: parsed\n"
            "tags: [excalidraw]\n\n"
            "---\n"
            "==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this "
            "document. ⚠==\n\n\n"
            "# Excalidraw Data\n\n"
            "## Text Elements\n"
            f"{te_lines}\n\n"
            "## Drawing\n"
            "```json\n"
            f"{payload}\n"
            "```\n%%"
        )
        open(path, "w", encoding="utf-8").write(md)
    else:
        open(path, "w", encoding="utf-8").write(payload)
    return path

def resolve_out(out, default_name):
    if not out:
        out = default_name
    if not (out.endswith(".excalidraw") or out.endswith(".excalidraw.md")):
        out = out + ".excalidraw.md"
    # a bare filename (no directory) lands in the vault's Excalidraw folder
    if not os.path.dirname(out):
        out = os.path.join(DEFAULT_DIR, out)
    return out

def start_y_for(path, append):
    if append and os.path.exists(path):
        return _bottom_of(_existing_elements(path)) + 160
    return 0

# ---- build (mindmap) -------------------------------------------------------
def load_tree(p):
    t = json.load(open(p, encoding="utf-8"))
    if isinstance(t, dict) and "text" in t:
        return t
    if isinstance(t, dict):
        (root, branches), = t.items() if len(t) == 1 else [(list(t)[0], t[list(t)[0]])]
        node = {"text": root, "children": []}
        for bname, leaves in branches.items():
            node["children"].append({"text": bname,
                                     "children": [{"text": l} for l in (leaves or [])]})
        return node
    sys.exit("Unrecognized tree format")

BRANCH_COLORS = ["#1971c2", "#2f9e44", "#e8590c", "#9c36b5", "#c2255c", "#0c8599"]

def layout_tree(root, base_x, start_y, col_w, row_h):
    cursor = [start_y]
    def assign(node, depth):
        node["_x"] = base_x + depth * col_w
        kids = node.get("children") or []
        if not kids:
            node["_y"] = cursor[0]; cursor[0] += row_h
        else:
            for k in kids:
                assign(k, depth + 1)
            node["_y"] = (kids[0]["_y"] + kids[-1]["_y"]) / 2
    assign(root, 0)
    return cursor[0]

def cmd_build(args):
    root = load_tree(args.tree)
    out = resolve_out(args.out, os.path.splitext(os.path.basename(args.tree))[0])
    sy = start_y_for(out, args.append) if (args.start_y is None) else args.start_y
    layout_tree(root, args.base_x, sy, args.col_w, args.row_h)
    idx = Idx()
    elements = []
    NODE_W, NODE_H = 220, 60

    def emit(node, depth, parent_box=None, color="#1e1e1e"):
        is_root = depth == 0
        fill = "#a5d8ff" if is_root else "#ffffff"
        stroke = "#1971c2" if is_root else color
        box = shaped_box("rectangle", node["_x"], node["_y"] - NODE_H / 2,
                         NODE_W, NODE_H, node["text"], idx, elements,
                         fill=fill, stroke=stroke, text_color="#1e1e1e",
                         font_size=22 if is_root else 18)
        if parent_box is not None:
            arrow_element(parent_box, box, idx, elements, color=color)
        kids = node.get("children") or []
        for i, k in enumerate(kids):
            kcolor = BRANCH_COLORS[i % len(BRANCH_COLORS)] if is_root else color
            emit(k, depth + 1, box, kcolor)
        return box

    emit(root, 0)
    write_doc(out, elements, append=args.append)
    print(f"wrote {len(elements)} elements -> {out}")

# ---- flow (flowchart / layered) -------------------------------------------
# Excalidraw has no parallelogram/pill: io->rectangle, start/end->ellipse, decision->diamond.
FLOW_STYLE = {
    "start":      {"shape": "ellipse",   "fill": "#b2f2bb", "stroke": "#2f9e44", "text": "#1b5e20", "w": 190, "h": 74},
    "end":        {"shape": "ellipse",   "fill": "#b2f2bb", "stroke": "#2f9e44", "text": "#1b5e20", "w": 190, "h": 74},
    "process":    {"shape": "rectangle", "fill": "#d0ebff", "stroke": "#1971c2", "text": "#0b3d91", "w": 240, "h": 92, "round": True},
    "decision":   {"shape": "diamond",   "fill": "#ffec99", "stroke": "#f08c00", "text": "#7a5900", "w": 250, "h": 130},
    "io":         {"shape": "rectangle", "fill": "#e9ecef", "stroke": "#495057", "text": "#212529", "w": 240, "h": 92, "round": True},
    "subprocess": {"shape": "rectangle", "fill": "#e5dbff", "stroke": "#6741d9", "text": "#4a2f8f", "w": 240, "h": 92},
}
LAYER_FILL = ["#e7f5ff", "#ebfbee", "#fff9db", "#f3f0ff", "#fff0f6", "#e3fafc"]

def _detect_back_edges(node_ids, edges):
    adj = {n: [] for n in node_ids}
    for e in edges:
        if e["from"] in adj and e["to"] in adj:
            adj[e["from"]].append(e["to"])
    color = {n: 0 for n in node_ids}
    back = set()
    sys.setrecursionlimit(max(1000, len(node_ids) * 4))
    def dfs(u):
        color[u] = 1
        for v in adj[u]:
            if color[v] == 1:
                back.add((u, v))
            elif color[v] == 0:
                dfs(v)
        color[u] = 2
    indeg = {n: 0 for n in node_ids}
    for e in edges:
        if e["to"] in indeg and e["from"] in indeg:
            indeg[e["to"]] += 1
    starts = [n for n in node_ids if indeg[n] == 0] or ([node_ids[0]] if node_ids else [])
    for s in starts:
        if color[s] == 0:
            dfs(s)
    for n in node_ids:
        if color[n] == 0:
            dfs(n)
    return back

def rank_nodes(node_ids, edges):
    from collections import deque
    back = _detect_back_edges(node_ids, edges)
    adj = {n: [] for n in node_ids}
    indeg = {n: 0 for n in node_ids}
    for e in edges:
        if e["from"] in adj and e["to"] in adj and (e["from"], e["to"]) not in back:
            adj[e["from"]].append(e["to"]); indeg[e["to"]] += 1
    rank = {n: 0 for n in node_ids}
    q = deque([n for n in node_ids if indeg[n] == 0])
    while q:
        u = q.popleft()
        for v in adj[u]:
            if rank[v] < rank[u] + 1:
                rank[v] = rank[u] + 1
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return rank

def cmd_flow(args):
    spec = json.load(open(args.spec, encoding="utf-8"))
    nodes = spec.get("nodes", [])
    edges = spec.get("edges", [])
    if not nodes:
        sys.exit("flow spec has no `nodes`")
    out = resolve_out(args.out, os.path.splitext(os.path.basename(args.spec))[0])
    sy = start_y_for(out, args.append) if (args.start_y is None) else args.start_y
    bx = args.base_x
    idx = Idx()
    elements = []
    ref_box = {}

    def place_node(n, cx, cy):
        s = FLOW_STYLE.get(n.get("type", "process"), FLOW_STYLE["process"])
        box = shaped_box(s["shape"], cx - s["w"] / 2, cy - s["h"] / 2, s["w"], s["h"],
                         n.get("label", ""), idx, elements,
                         fill=s["fill"], stroke=s["stroke"], text_color=s["text"],
                         rounded=s.get("round", False))
        ref_box[n["id"]] = box

    if args.layers:
        from collections import defaultdict
        by_lane, lanes = defaultdict(list), []
        for n in nodes:
            ln = n.get("lane", "(sem camada)")
            if ln not in lanes:
                lanes.append(ln)
            by_lane[ln].append(n)
        order = spec.get("lane_order")
        if order:
            lanes = [l for l in order if l in lanes] + [l for l in lanes if l not in (order or [])]
        max_w = max((len(v) for v in by_lane.values()), default=1)
        node_gap = args.node_gap
        lane_gap = args.lane_gap
        lane_width = max_w * node_gap + 120
        for li, ln in enumerate(lanes):
            ly = sy + li * lane_gap
            fr = frame_element(ln, bx - 60, ly - 40, lane_width, lane_gap - 40, idx)
            elements.append(fr)
            for i, n in enumerate(by_lane[ln]):
                place_node(n, bx + i * node_gap + node_gap / 2, ly + (lane_gap - 40) / 2 - 10)
    else:
        from collections import defaultdict
        ids = [n["id"] for n in nodes]
        rank = rank_nodes(ids, edges)
        by_rank = defaultdict(list)
        for n in nodes:
            by_rank[rank[n["id"]]].append(n)
        for r in sorted(by_rank):
            row = by_rank[r]
            cnt = len(row)
            for i, n in enumerate(row):
                off = (i - (cnt - 1) / 2.0) * args.node_gap
                if args.dir == "LR":
                    place_node(n, bx + r * args.rank_gap, sy + off)
                else:
                    place_node(n, bx + off, sy + r * args.rank_gap)

    for e in edges:
        a, z = ref_box.get(e["from"]), ref_box.get(e["to"])
        if a and z:
            arrow_element(a, z, idx, elements, label=e.get("label"),
                          color=e.get("color", "#6b6b6b"))
    write_doc(out, elements, append=args.append)
    kind = "layers" if args.layers else args.dir
    print(f"wrote {len(elements)} elements ({kind}) -> {out}")

# ---- create (free-form) ----------------------------------------------------
STICKY_HEX = {
    "light_yellow": "#fff3bf", "light_green": "#d3f9d8", "light_pink": "#ffdeeb",
    "light_blue": "#d0ebff", "blue": "#a5d8ff", "violet": "#e5dbff",
    "gray": "#e9ecef", "green": "#b2f2bb", "yellow": "#ffec99", "red": "#ffc9c9",
    "orange": "#ffd8a8",
}
SHAPE_MAP = {"rectangle": "rectangle", "round_rectangle": "rectangle",
             "circle": "ellipse", "ellipse": "ellipse", "oval": "ellipse",
             "rhombus": "diamond", "diamond": "diamond", "triangle": "diamond"}

def cmd_create(args):
    spec = json.load(open(args.spec, encoding="utf-8"))
    out = resolve_out(args.out, os.path.splitext(os.path.basename(args.spec))[0])
    sy_off = start_y_for(out, args.append) if args.append else 0
    idx = Idx()
    elements = []
    ref_box = {}
    for it in spec.get("items", []):
        t = it.get("type", "shape")
        x, y = it.get("x", 0), it.get("y", 0) + sy_off
        if t == "frame":
            fr = frame_element(it.get("title", it.get("text", "Frame")),
                               x, y, it.get("width", 900), it.get("height", 500), idx)
            elements.append(fr)
            if it.get("ref"):
                ref_box[it["ref"]] = fr
        elif t == "text":
            el = text_element(it.get("text", ""), x, y, idx,
                              font_size=it.get("fontSize", 20),
                              color=it.get("textColor", "#1e1e1e"))
            if it.get("link"):
                el["link"] = it["link"]
            elements.append(el)
            if it.get("ref"):
                ref_box[it["ref"]] = el
        else:  # sticky_note | shape | card
            if t == "sticky_note":
                fill = STICKY_HEX.get(it.get("color", "light_yellow"), "#fff3bf")
                shape, stroke, w, h = "rectangle", "#e0b400", it.get("width", 200), it.get("height", 200)
                text, tcolor = it.get("text", ""), "#1e1e1e"
            elif t == "card":
                fill = it.get("fillColor", "#ffffff")
                shape, stroke = "rectangle", it.get("borderColor", "#1e1e1e")
                w, h = max(220, it.get("width", 256)), it.get("height", 140)
                title, desc = it.get("title", it.get("text", "")), it.get("description", "")
                text = title + ("\n\n" + desc if desc else "")
                tcolor = it.get("textColor", "#1e1e1e")
            else:  # shape
                fill = it.get("fillColor", it.get("color", "#ffffff"))
                if fill in STICKY_HEX:
                    fill = STICKY_HEX[fill]
                shape = SHAPE_MAP.get(it.get("shape", "rectangle"), "rectangle")
                stroke = it.get("borderColor", it.get("strokeColor", "#1e1e1e"))
                w, h = it.get("width", 200), it.get("height", 120)
                text, tcolor = it.get("text", ""), it.get("textColor", "#1e1e1e")
            box = shaped_box(shape, x, y, w, h, text, idx, elements,
                             fill=fill, stroke=stroke, text_color=tcolor,
                             font_size=it.get("fontSize", 20),
                             rounded=it.get("shape") in (None, "round_rectangle", "rectangle"))
            if it.get("link"):
                box["link"] = it["link"]
            if it.get("ref"):
                ref_box[it["ref"]] = box

    for c in spec.get("connectors", []):
        a, z = ref_box.get(c["from"]), ref_box.get(c["to"])
        if a and z:
            arrow_element(a, z, idx, elements, label=c.get("caption"),
                          color=c.get("color", "#1e1e1e"))
        else:
            print(f"SKIP connector {c.get('from')}->{c.get('to')}: unresolved ref", file=sys.stderr)
    write_doc(out, elements, append=args.append)
    print(f"wrote {len(elements)} elements -> {out}")

# ---- cli -------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Excalidraw engine for Obsidian (local files)")
    sub = ap.add_subparsers(dest="cmd", required=True)

    b = sub.add_parser("build", help="mindmap from a recursive tree JSON")
    b.add_argument("--tree", required=True); b.add_argument("--out", default="")
    b.add_argument("--append", action="store_true")
    b.add_argument("--start-y", type=float, default=None); b.add_argument("--base-x", type=float, default=0)
    b.add_argument("--col-w", type=float, default=320); b.add_argument("--row-h", type=float, default=90)
    b.set_defaults(fn=cmd_build)

    f = sub.add_parser("flow", help="auto-laid-out flowchart (nodes+edges) or --layers")
    f.add_argument("--spec", required=True); f.add_argument("--out", default="")
    f.add_argument("--append", action="store_true")
    f.add_argument("--dir", choices=["TD", "LR"], default="TD")
    f.add_argument("--layers", action="store_true")
    f.add_argument("--start-y", type=float, default=None); f.add_argument("--base-x", type=float, default=0)
    f.add_argument("--rank-gap", type=float, default=200); f.add_argument("--node-gap", type=float, default=320)
    f.add_argument("--lane-gap", type=float, default=240)
    f.set_defaults(fn=cmd_flow)

    c = sub.add_parser("create", help="free-form objects from a spec + connectors")
    c.add_argument("--spec", required=True); c.add_argument("--out", default="")
    c.add_argument("--append", action="store_true")
    c.set_defaults(fn=cmd_create)

    args = ap.parse_args()
    args.fn(args)

if __name__ == "__main__":
    main()
