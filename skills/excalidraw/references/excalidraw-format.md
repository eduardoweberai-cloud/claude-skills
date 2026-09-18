# Excalidraw file format (Obsidian) — gotchas reference

Everything here is already implemented in `scripts/excalidraw.py`. Read this only when
changing the emitter or debugging a file that will not render.

## Two on-disk formats

Both open in the Obsidian Excalidraw plugin. Both are supported.

### 1. `.excalidraw` — raw JSON

A single JSON object:
```json
{ "type": "excalidraw", "version": 2, "source": "...",
  "elements": [ ... ], "appState": { "viewBackgroundColor": "#ffffff", "gridSize": 20 },
  "files": {} }
```
Simplest to generate. Does NOT participate in the Obsidian graph/tags.

### 2. `.excalidraw.md` — Obsidian-native (DEFAULT for this skill)

Markdown wrapper around the same JSON. Chosen because it appears in the graph, is
searchable, and carries `tags: [excalidraw]`. Uncompressed structure (what the script
writes):
```
---

excalidraw-plugin: parsed
tags: [excalidraw]

---
==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==


# Excalidraw Data

## Text Elements
<one line per text element: "the text ^elementId">

## Drawing
```json
{ ...the same excalidraw JSON... }
```
%%
```
Key points:
- Frontmatter `excalidraw-plugin: parsed` + `tags: [excalidraw]` is what makes the
  plugin treat the note as a drawing.
- The `## Drawing` fenced block holds the authoritative JSON. The plugin also accepts
  ` ```compressed-json ` (LZ-string compressed); we write plain ` ```json ` so it is
  human-diffable. The plugin re-compresses on its own save if that setting is on.
- `## Text Elements` is a derived mirror (for Obsidian search + block refs `^id`). It is
  not authoritative; the plugin regenerates it. We populate it as a courtesy.
- The trailing `%%` closes the Obsidian comment that hides the raw data in reading view.

## Element schema (the fields that matter)

Every element needs these common fields (the script's `_base()` sets them):
`id, type, x, y, width, height, angle:0, strokeColor, backgroundColor, fillStyle,
strokeWidth, strokeStyle, roughness, opacity:100, groupIds:[], frameId, index, roundness,
seed, version, versionNonce, isDeleted:false, boundElements, updated, link, locked`.

- **`type`**: `rectangle | ellipse | diamond | arrow | line | text | frame | image | freedraw`.
  There is NO parallelogram, pill, card, or round-rectangle *type*. Rounded corners are a
  property (`roundness: {type: 3}`) of a rectangle, not a separate shape.
- **`roughness`**: 1 = hand-drawn (the default). 0 = clean/architect.
- **`fillStyle`**: `solid` so `backgroundColor` renders as a flat fill (Excalidraw's
  default is `hachure`, which looks sketchy). The script forces `solid`.
- **`index`**: a fractional-index string; must be strictly increasing lexicographically
  across the element array. The script uses zero-padded keys (`a00000`, `a00001`, ...),
  which sort correctly. Excalidraw re-normalizes on load if needed.
- **`seed` / `versionNonce`**: random ints; only affect the sketch RNG. Any value works.
- **`roundness`**: `{type: 3}` for rounded rectangles, `{type: 2}` for arrows, `null` for
  text/diamond/ellipse.

## Bound text (text inside a shape)

Two-way link, BOTH sides required or the text floats free:
1. The container shape lists the text in `boundElements`: `[{"type":"text","id":"<textId>"}]`.
2. The text element sets `containerId: "<shapeId>"`, `verticalAlign:"middle"`,
   `textAlign:"center"`, and is positioned centered inside the shape.

The script's `shaped_box()` handles both. Excalidraw re-measures/re-wraps the text on
load (because `autoResize:true`), so approximate width/height are fine.

## Bound arrows (connectors)

An arrow binds to shapes via `startBinding`/`endBinding`:
```json
"startBinding": {"elementId": "<fromId>", "focus": 0, "gap": 4},
"endBinding":   {"elementId": "<toId>",   "focus": 0, "gap": 4}
```
AND both shapes must list the arrow in their `boundElements`:
`{"id":"<arrowId>","type":"arrow"}`. The arrow's `x,y` is its start point; `points` is a
list of `[dx,dy]` offsets from that start (`[[0,0],[endDx,endDy]]` for a straight arrow).

To avoid arrows stabbing into boxes on first open, the script clips each endpoint to the
shape's border (`_edge_point()`), rather than drawing center-to-center. Excalidraw then
keeps them attached via the binding when shapes move. `endArrowhead:"arrow"`,
`startArrowhead:null`.

## Frames (swimlanes / containers)

`type:"frame"` with a `name` (title shown top-left). Items are visually "inside" a frame
by coordinates, not by API parenting. Create the frame first so it renders behind its
contents.

## Coordinate system

- Origin is arbitrary; `x` grows right, `y` grows DOWN.
- The `build`/`flow` layouts compute all coordinates. `create` takes coordinates from the
  spec. `--append` reads the existing file's max-y and offsets new content below it.

## Windows / PT-BR

Always write UTF-8 (`open(path,"w",encoding="utf-8")`, `ensure_ascii=False`). Run the
script with `PYTHONUTF8=1 python -X utf8` or accented text (ção, ã, é)
corrupts.

## Font families

`fontFamily`: 1 = Virgil/hand-drawn (old), 5 = Excalifont (current hand-drawn, what
the default), 2 = Helvetica/normal, 3 = Cascadia/code, 6 = Nunito. The script
defaults to 5 (hand-drawn look).
