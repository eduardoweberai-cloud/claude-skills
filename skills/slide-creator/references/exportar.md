# Exportar o deck para PDF

O template já tem CSS de impressão: cada `<section class="slide">` vira uma página
16:9, sem cabeçalho nem rodapé do navegador. Use o Chrome ou o Edge em modo
headless (troque os caminhos pelos seus).

## Windows (PowerShell)

```powershell
$html = (Resolve-Path .\meu-deck.html).Path -replace '\\','/'
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$PWD\meu-deck.pdf" "file:///$html"
```

Sem Edge nesse caminho: troque por `"C:\Program Files\Google\Chrome\Application\chrome.exe"`.

## Mac

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$PWD/meu-deck.pdf" "file://$PWD/meu-deck.html"
```

## Linux

```bash
google-chrome --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$PWD/meu-deck.pdf" "file://$PWD/meu-deck.html"
```

## Conferir

Abra o PDF e confira: número de páginas igual ao número de slides, nada cortado
na borda, fontes certas. Se a fonte do Google Fonts não carregou a tempo, adicione
`--virtual-time-budget=5000` ao comando.
