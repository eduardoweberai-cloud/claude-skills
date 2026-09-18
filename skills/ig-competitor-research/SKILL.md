---
name: ig-competitor-research
description: "Pesquisa de concorrentes no Instagram: raspa posts do período, ranqueia por engajamento, extrai hook/frames/transcript de cada post vencedor e monta relatório HTML com análise. Use quando pedirem 'pesquisa de concorrentes IG', 'pesquisa concorrentes <nicho>', 'o que está viralizando no nicho X', 'analisa esses perfis do Instagram', ou pesquisa de conteúdo pra criar posts/reels. Custo baixo (Apify, com crédito grátis mensal, + FFmpeg/Whisper local)."
---

# IG Competitor Research

Raspa concorrentes do Instagram e devolve o top conteúdo do período com hook, formato, transcript e "why it worked" num relatório HTML. Trabalho mecânico é determinístico (scripts); só a análise por post usa subagentes.

## Fluxo interativo (OBRIGATÓRIO: pergunte antes de rodar)

NÃO rode nada antes de confirmar.

### Passo 1: Pergunte
1. **Handles:** um slug de arquivo (`data/competitors/<slug>.txt`) ou os `@` colados agora (aceita os dois juntos).
2. **Período:** default últimos 7 dias; ou range `YYYY-MM-DD..YYYY-MM-DD`.
3. **Top N:** default 15.

### Passo 2: Confirme em texto + custo
> "Vou rodar: N handles · período X · top N · custo Apify estimado ~$Y (cap 60/handle × N × $2.30/1000). OK?"

### Passo 3: Prepare (determinístico)
```bash
cd <skill-dir>
npx tsx scripts/run.ts --prepare --slug <slug> [--handles @a,@b] [--from YYYY-MM-DD --to YYYY-MM-DD] [--top 15]
```
Isso gera `outputs/<slug>/<data>/prepared.json` com métricas, ranking e paths de frames/transcript por post.

### Passo 4: Fan-out de análise (VOCÊ, via Agent tool)
Leia `prepared.json`. Para CADA post em `posts[]`, dispare um subagente (Agent tool, `general-purpose`, em paralelo: todos numa só mensagem). Sem subagentes disponíveis (ex.: Codex), analise post a post, na mesma ordem. O prompt de cada subagente deve:
- Ler visualmente os arquivos em `framePaths`.
- Ler o `transcriptPath` (se houver) e a `caption`.
- Devolver SÓ um JSON com `hook`, `visualFormat`, `topic`, `whyItWorked`, `transcript`.
- Regra No-Invention: só o que os frames/transcript mostram; PT-BR, sem travessões.

(O texto exato do prompt está em `scripts/analysis.ts::buildAnalysisPrompt`: use como referência.)

Junte os JSONs num array e salve em `outputs/<slug>/<data>/analysis.json`. Cada objeto precisa do campo `shortcode` correspondente.

### Passo 5: Render
```bash
npx tsx scripts/run.ts --render --slug <slug>
```
Gera `report.html` (self-contained, abre no navegador) e `report.json`.

### Passo 6: Loop de reuso
Ofereça: "Quer que eu leia o report.json e gere ideias de conteúdo pro seu nicho, já treinado nesse top content?"

## Setup (uma vez)
```bash
cd <skill-dir>
npm install
cp .env.example .env   # e cole o seu token
```
- `APIFY_TOKEN` em `.env`: crie a conta em apify.com e copie em Settings > API & Integrations. O `.env` nunca vai para o git.
- **Node.js 20+**.
- **FFmpeg**: Windows `winget install Gyan.FFmpeg`, Mac `brew install ffmpeg`.
- **Whisper local**: `pip install whisper-ctranslate2` (transcreve os Reels na sua máquina, sem custo de API).
- Valide com `ffmpeg -version` e `whisper-ctranslate2 --help`.

## Arquivo de concorrentes
`data/competitors/<slug>.txt`: um `@handle` por linha, `#` = comentário. Veja `data/competitors/exemplo.txt`. Suas listas reais ficam fora do git.

## Limitações honestas
- Whisper `small` erra em Reel com música/ruído.
- `videoUrl` do Apify pode expirar → post marcado `degraded`, análise usa só frames+legenda.
- Copiar formato do concorrente commoditiza; a skill dá matéria-prima, a criação continua sua.
