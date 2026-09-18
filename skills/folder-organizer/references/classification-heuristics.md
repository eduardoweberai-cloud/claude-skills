# Classification Heuristics

How to map a file to a destination inside the user's taxonomy. These are
defaults; the saved profile's `rules` always win over these generic hints.

## Core principle: confidence gating

Classify a file into a destination ONLY when confident. "Confident" means the
filename, extension, or location gives a clear, unambiguous signal. Everything
else goes to the **ambiguous list** and is handled by `ambiguous_policy` (never
silently moved).

Confidence signals (high -> low):
- Explicit project/keyword in the name (`clientex`, `boleto`, project name)
- A format pair whose sibling is already classified
- File type strongly implying a category (`.fprg` -> programming exercise)
- Generic name with no signal (`download.png`, `file_2.jpg`, UUID names) -> ambiguous

## Generic keyword -> category hints

| Signal in filename / type | Likely destination |
|---|---|
| Long all-numeric name (barcode) | FINANCEIRO/Boletos |
| `nota fiscal`, `nfse`, `nf-e` | FINANCEIRO/NFSE |
| `invoice`, `proposta`, `orçamento`, `servicos` | FINANCEIRO/Propostas |
| `boleto`, `fatura` | FINANCEIRO/Boletos |
| Brand/logo/identidade visual, `.ai`/`.cdr`/vector pdf | TECNOLOGIA or PROFISSIONAL design subfolder |
| `transcri`, `conversa`, `reunião`/`reuniao` (.txt) | PROFISSIONAL/Transcricoes |
| `.docx`/`.pdf` school work, `trabalho`, `tarefa`, `atividade` | ESTUDOS/Faculdade |
| `.fprg`, `.ipynb`, code/scripts, `.zip` of a repo | TECNOLOGIA or ESTUDOS/Programação |
| Generated images, `cover-yt`, thumbnails, `*gerada*` | MIDIA (image subfolder) |
| `.mp4`/`.mov` recordings | MIDIA/recordings or the matching project folder |
| Book/ebook text, author names | PESSOAL/Livros |

## Ambiguity red flags (always send to the ambiguous list)

- Generic auto-download names: `download(N).png`, `file_N.jpg`, `image.png`
- UUID / hash filenames with no human-readable hint
- Screenshots (`WhatsApp Image ...`, `Screenshot ...`, `FireShot ...`) unless
  the rest of the name makes the topic obvious
- Anything under a "personal" category where the topic is unclear — do not guess
  at the user's private files; ask.

## Duplicates vs. format pairs

The scan reports two kinds of matches; treat them differently:
- **exact** (same size + SHA-256): true duplicate. Safe candidate to remove,
  but still confirm per `duplicates_policy`.
- **siblings** (same normalized stem): usually a `.docx`+`.pdf` source/export
  pair or `_2` version. These are NOT duplicates — default is keep both, move
  them together to the same destination. Only flag versions (`file` vs `file_2`)
  for the user to choose if they ask to deduplicate.

## Creating new subfolders

When 3+ loose files share an obvious project/topic that has no home in the
current taxonomy, propose ONE new subfolder (e.g. `PROFISSIONAL/ClienteX`) rather
than scattering them. Always propose it in the plan and let the user veto.
