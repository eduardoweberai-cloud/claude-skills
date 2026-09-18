# 15 skills essenciais para o seu Claude ou Codex

Skills são pastas com instruções (e às vezes scripts) que ensinam o seu agente de IA
a fazer uma tarefa sempre do mesmo jeito, bem feito. Você chama com `/nome-da-skill`
ou só pede em linguagem natural.

Este repositório tem as **10 skills que eu criei** (versões abertas, sem nenhum dado
meu ou de cliente) e os links oficiais das **5 de outros autores** que eu uso todo dia.

## Jeito mais fácil de instalar

Abra o Claude Code (ou o Codex) numa pasta qualquer e mande:

> Clone o repositório https://github.com/eduardoweberai-cloud/claude-skills, leia o README e instale na minha pasta de skills as skills: roast, slide-creator, deep-research (troque pela lista que você quer). Rode o setup de cada uma e me peça só as chaves e logins que dependem de mim.

## Instalação manual

Copie a pasta da skill (dentro de `skills/`) para:

- **Claude Code:** `~/.claude/skills/<nome>` (vale para todos os projetos) ou `.claude/skills/<nome>` dentro de um projeto.
- **Codex:** `~/.codex/skills/<nome>`.

Algumas skills têm um passo de setup (dependências ou chave de API). Está no
`SKILL.md` de cada uma e na tabela abaixo.

## As 15

| # | Skill | O que faz | Onde está | Precisa de |
|---|---|---|---|---|
| 1 | `/roast` | Conselho de 5 personalidades que te questionam de verdade, mais um juiz que dá o veredito e o teste de 48h mais barato | [skills/roast](skills/roast) | nada |
| 2 | `/slide-creator` | Apresentação com narrativa primeiro: roteiro, notas e deck HTML com exportação para PDF | [skills/slide-creator](skills/slide-creator) | Chrome ou Edge (para o PDF) |
| 3 | `/deep-research` | Pesquisa profunda com até 5 buscas em paralelo, fontes classificadas e relatório salvo numa pasta de pesquisas | [skills/deep-research](skills/deep-research) | Node.js 20+ |
| 4 | `/superpowers` | Pacote que muda o jeito do agente trabalhar: brainstorm, plano, testes, debug, revisão | [obra/superpowers](https://github.com/obra/superpowers) | instala como plugin (veja o link) |
| 5 | `/site-builder` | Landing page inteira: narrativa por seção, prompts de imagem e vídeo, efeitos e build | [skills/site-builder](skills/site-builder) | nada (imagem paga é opcional) |
| 6 | `/image-prompt-generator` | Escreve o melhor prompt para gerar imagem no ChatGPT / GPT Image | [skills/image-prompt-generator](skills/image-prompt-generator) | nada |
| 7 | `/ig-competitor-research` | Vasculha os posts dos concorrentes no Instagram, ranqueia os que viralizaram e explica por quê | [skills/ig-competitor-research](skills/ig-competitor-research) | Node.js, conta Apify, FFmpeg, Whisper local |
| 8 | `/emitir-nfse` | Emite NFS-e no Emissor Nacional (gov.br) e para na revisão antes de emitir | [skills/emitir-nfse](skills/emitir-nfse) | Playwright MCP, Simples Nacional, município no padrão nacional |
| 9 | `/folder-organizer` | Organiza uma pasta bagunçada (ex.: Downloads) com plano aprovado antes e desfazer depois | [skills/folder-organizer](skills/folder-organizer) | Python |
| 10 | `/excalidraw` | Mapas mentais, fluxogramas e diagramas editáveis no Excalidraw / Obsidian | [skills/excalidraw](skills/excalidraw) | Python |
| 11 | `/video-use` | Edita vídeo conversando: corta "éé" e tempo morto, legenda, cor | [browser-use/video-use](https://github.com/browser-use/video-use) | FFmpeg, chave ElevenLabs (veja o link) |
| 12 | `/design-md` | Extrai o design system de qualquer site num `DESIGN.md` que a sua IA usa | [por Alan Nicolas](https://github.com/marketingLendario/cohort-de-marketing/tree/main/.claude/skills/design-md) | Node.js |
| 13 | `/screenwatch` | Grava sua tela localmente e mostra onde você perde tempo, com sugestão de atalho ou automação | [skills/screenwatch](skills/screenwatch) | Windows, Python |
| 14 | `/memory` | Salva o que foi feito na sessão e puxa o que foi feito nas anteriores | [skills/memory](skills/memory) | Python |
| 15 | `/skill-creator` | A skill oficial da Anthropic para criar novas skills | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/skill-creator) | nada |

## Avisos importantes

- **`/emitir-nfse`**: preencha `nfse.config.json` com os dados da SUA empresa e valide
  os campos fiscais com o seu contador antes de emitir a primeira nota. A skill sempre
  para na tela de revisão e só emite com o seu OK.
- **`/screenwatch`**: tira prints da sua tela. Ficam só no seu computador, mas leia a
  seção de privacidade do `SKILL.md` antes de ligar.
- **Chaves de API** (Apify, ElevenLabs etc.) ficam em arquivos `.env` que nunca vão
  para o git. Não cole chave no chat.

## Licença

As skills deste repositório estão sob a licença MIT (veja `LICENSE`). As skills de
terceiros seguem a licença de cada autor, no link de cada uma.
