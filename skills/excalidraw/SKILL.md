---
name: excalidraw
description: "Cria diagramas como arquivos .excalidraw.md que abrem no Obsidian (plugin Excalidraw) ou em excalidraw.com (local, sem rede): mind maps, flowcharts auto-layout, swimlanes/camadas e boards livres (shapes, texto, frames, cards, setas). Use quando pedir um excalidraw, diagrama/fluxo/mapa mental no Obsidian, desenhar flowchart, mapear processo visualmente no vault, ou visual editável no Obsidian. NÃO para slides, imagens geradas por IA ou boards do Miro."
---

# Excalidraw (mindmaps + flowcharts + free-form, in Obsidian)

Build any diagram as an Excalidraw file that opens directly in the Obsidian
Excalidraw plugin (or in excalidraw.com when saved as `.excalidraw`). Everything is computed locally and written to disk: NO API, NO
network. The hard parts of the Excalidraw file format (bound text, bound arrows
clipped to shape borders, the `.excalidraw.md` wrapper, fractional indices, no
parallelogram/pill shapes, UTF-8 for PT-BR) are solved inside `scripts/excalidraw.py`.
Drive that script; do not hand-write Excalidraw JSON.

## When to use

- "cria um mapa mental de X no excalidraw", "joga isso num excalidraw"
- "desenha um fluxo / flowchart / diagrama no Obsidian", "mapeia esse processo"
- "monta um diagrama de camadas / raias"
- "quero um visual que eu edito no Obsidian"

## Three builders

- **`build`** — a mind map (root → branches → leaves), one tree, tidy auto-layout.
  Best when the content is hierarchical.
- **`flow`** — an auto-laid-out **flowchart** from `{nodes, edges}`. YOU do NOT compute
  x/y: it ranks nodes topologically (decision loop-backs handled) and styles each by
  type. Right tool for a "fluxo/flowchart bonito", NOT a mind map. `--layers` renders
  swimlanes by `node.lane` (layered architecture / N-camadas diagram).
- **`create`** — arbitrary objects from a spec: shapes, sticky notes, text, frames,
  cards, plus arrows between them. YOU set each object's (x, y). Best for kanban,
  matrices, or mixed boards with full manual control.

Every builder writes ONE `.excalidraw.md` file and prints the element count + path.

## Prerequisites

- Python with UTF-8 forced on Windows: prefix `PYTHONUTF8=1` and use
  `python -X utf8` (accented PT-BR text breaks otherwise).
- No token, no secrets, no board id. This writes local files only.

## Output file (`--out`)

- **Default folder**: `$EXCALIDRAW_DIR` if set (point it to your Obsidian vault's
  Excalidraw folder), otherwise `./excalidraw` in the current directory. A bare
  `--out "Nome do desenho"` lands there as `Nome do desenho.excalidraw.md`.
- **Format**: `.excalidraw.md` (Obsidian-native, uncompressed, with `tags: [excalidraw]`
  frontmatter — shows in the graph, searchable). Pass an `--out` ending in
  `.excalidraw` to write raw JSON instead.
- **`--append`**: merge into an existing target file. New content is dropped BELOW the
  existing drawing (never overlaps, never replaces). Default (no flag) creates/overwrites.
- If `--out` is omitted, the file is named after the input JSON.

## Two input modes (decide per request)

- **Free theme** — the user gives a topic ("mapa do meu posicionamento"). Build the
  structure from context: query the Memory Vault first (`/memory:query`) for anything
  client/positioning/strategy related, then author root → branches → leaves (for `build`)
  or nodes → edges (for `flow`). Keep phrases short, in the user's voice.
- **Outline given** — the user provides the structure. Render it faithfully; do not
  invent branches.

When unsure which, ask one short question. Respect the no-em-dash rule (use colons,
commas, parentheses; ranges like "0 a 3").

## Core workflow

1. **Author the input JSON** as a UTF-8 file (use the Write tool or
   `json.dump(..., ensure_ascii=False)`).

2. **Run the matching builder** (examples below).

3. **Ask the user to open the file in Obsidian** (Excalidraw view). Rendering is
   client-side: the script guarantees valid structure and element count, but only
   Obsidian shows the final visual. This doubles as the visual review checkpoint.

### `build` — mind map

Recursive tree (any depth):
```json
{"text": "Root topic",
 "children": [
   {"text": "Branch A", "children": [{"text": "leaf 1"}, {"text": "leaf 2"}]},
   {"text": "Branch B", "children": [{"text": "leaf 3"}]}
 ]}
```
Flat 3-level form also accepted: `{"Root": {"Branch A": ["leaf 1","leaf 2"], "Branch B": ["leaf 3"]}}`.
```bash
PYTHONUTF8=1 python -X utf8 \
  "<skill-dir>/scripts/excalidraw.py" \
  build --tree tree.json --out "Meu mapa"
```
Root is filled/highlighted; each top branch gets its own color; leaves inherit the
branch color. Tuning: `--col-w 320` (horizontal gap per depth level), `--row-h 90`
(vertical gap per leaf).

### `flow` — flowchart (auto-layout, no manual coordinates)

```json
{
  "nodes": [
    {"id": "start", "type": "start",    "label": "Pedido chega"},
    {"id": "p1",    "type": "process",  "label": "Receber dados"},
    {"id": "d1",    "type": "decision", "label": "Dados completos?"},
    {"id": "p2",    "type": "process",  "label": "Lançar no ERP"},
    {"id": "end",   "type": "end",      "label": "Concluído"}
  ],
  "edges": [
    {"from": "start", "to": "p1"},
    {"from": "p1", "to": "d1"},
    {"from": "d1", "to": "p2",  "label": "sim"},
    {"from": "d1", "to": "p1",  "label": "não"},
    {"from": "p2", "to": "end"}
  ]
}
```
```bash
PYTHONUTF8=1 python -X utf8 \
  "<skill-dir>/scripts/excalidraw.py" \
  flow --spec flow.json --out "Fluxo do processo"
```
- **node `type`** → shape + color: `start`/`end` (green ellipse), `process` (blue
  rounded rect), `decision` (amber diamond), `io` (gray rect), `subprocess` (purple rect).
- **edges** become arrows; `label` becomes the caption ("sim"/"não" on decision branches).
- **direction**: `--dir TD` (top-down, default) or `--dir LR` (left-right).
- **spacing**: `--rank-gap 200` (between ranks), `--node-gap 320` (between siblings).

#### Layered / swimlane diagram (`--layers`)

Add `--layers` to render each distinct `node.lane` as a horizontal swimlane (a frame),
nodes spread inside it. Pass `lane_order` in the spec to fix the top-to-bottom order.
```json
{
  "lane_order": ["1 Contexto", "2 Dados", "3 Inteligência", "4 Automações"],
  "nodes": [
    {"id": "ctx",  "type": "process",    "label": "Modelo de contexto", "lane": "1 Contexto"},
    {"id": "mcp",  "type": "io",         "label": "MCP do ERP",          "lane": "2 Dados"},
    {"id": "brief","type": "process",    "label": "Daily Brief",         "lane": "3 Inteligência"},
    {"id": "auto", "type": "subprocess", "label": "Squad de cobrança",   "lane": "4 Automações"}
  ],
  "edges": [{"from": "ctx", "to": "mcp"}, {"from": "mcp", "to": "brief"}, {"from": "brief", "to": "auto"}]
}
```
```bash
... excalidraw.py flow --spec layers.json --out "Camadas" --layers --lane-gap 240
```

### `create` — free-form (shape, sticky_note, text, frame, card + arrows)

For anything that is not a single hierarchy or clean flow. YOU compute each object's
`x`/`y` (Excalidraw y grows downward).
```json
{
  "items": [
    {"ref": "fr", "type": "frame", "title": "Funil", "x": 0, "y": 0, "width": 1200, "height": 700},
    {"ref": "a", "type": "sticky_note", "text": "Lead entra", "x": 40, "y": 60, "color": "light_green"},
    {"ref": "b", "type": "shape", "shape": "round_rectangle", "text": "Diagnóstico", "x": 400, "y": 60, "width": 260, "height": 110, "fillColor": "#d0ebff", "borderColor": "#1971c2"},
    {"type": "text", "text": "Etapa 1", "x": 40, "y": 20, "fontSize": 20},
    {"ref": "c", "type": "card", "title": "Proposta", "description": "enviar em 24h", "x": 400, "y": 260}
  ],
  "connectors": [
    {"from": "a", "to": "b", "caption": "qualifica", "color": "#1971c2"},
    {"from": "b", "to": "c"}
  ]
}
```
```bash
... excalidraw.py create --spec spec.json --out "Board"
```
Field guide:
- **type**: `shape` | `sticky_note` | `text` | `frame` | `card`.
- **shape** (for `type: shape`): `rectangle`/`round_rectangle` → rectangle,
  `circle`/`ellipse`/`oval` → ellipse, `rhombus`/`diamond`/`triangle` → diamond.
- **color** (sticky): named (`light_yellow`, `light_green`, `light_pink`, `light_blue`,
  `blue`, `violet`, `gray`, ...). **fillColor**/**borderColor**/**textColor** (shape/card): HEX.
- **connectors**: `from`/`to` are item `ref`s, optional `caption`, `color`.
- **Frames as containers**: create the frame FIRST and place items at coords inside its
  rectangle (visual containment).

## Non-negotiable rules (why the script exists)

- **Author ALL text with full PT-BR accents and ç. NEVER transliterate to ASCII.**
  Write "não", "manhã", "adoração", "raízes", not "nao/manha/adoracao/raizes". This
  pipeline is UTF-8 safe end to end (`ensure_ascii=False` + utf-8 write): stripping
  accents "to be safe on Windows" is a BUG here, not a safeguard. Windows-1252/ASCII
  caution applies to `.ps1` files read by PowerShell, NOT to this UTF-8 pipeline. If
  the build prints the `AVISO UTF-8` warning, you transliterated: rewrite the source
  JSON with correct accents and regenerate before handing the file to the user.
- **Never hand-write Excalidraw JSON.** Bound text needs BOTH the shape's `boundElements`
  and the text's `containerId`; bound arrows must be clipped to shape borders and listed
  in both endpoints' `boundElements`. The script does all of this; raw JSON gets it wrong.
- **Never overwrite the user's existing drawing** unless they ask. To add to an existing
  file, use `--append` (drops new content below). Otherwise write a NEW file name.
- **Excalidraw has no parallelogram, pill, or card shapes.** The script maps io→rectangle,
  start/end→ellipse, decision→diamond, card→rectangle+bold title. Do not expect them.
- **Always ask the user to open the file** after building. Structure/count is guaranteed;
  the visual is not visible until Obsidian renders it client-side.

## Reference

Full Excalidraw file-format notes (element schema, bindings, the `.excalidraw.md`
wrapper, gotchas) in `references/excalidraw-format.md`. Read it before touching the
Excalidraw file format outside this script.
