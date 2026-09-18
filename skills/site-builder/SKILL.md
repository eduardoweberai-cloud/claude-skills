---
name: site-builder
description: "Orquestra a criação de sites e landing pages com IA de ponta a ponta, com imagens e vídeos gerados por IA integrados: design extraction de referência (opcional), pesquisa de conversão do nicho (opcional), planejamento narrativo seção a seção, prompts de imagem (ChatGPT/nano-banana) e prompt pack de vídeo (Seedance/Kling, manual), efeitos de UI do 21st.dev/Magic UI, modo cinematográfico com scroll-video 3D, build single-file Tailwind e finalização com WebP + self-review visual. Esta skill deve ser usada quando o usuário pedir para criar um site, landing page ou portfólio com IA, site com imagens/vídeos gerados, site animado ou cinematográfico, \"site estilo awwwards\", clonar o design de um site de referência, ou melhorar um site existente com esses recursos."
---

# site-builder: Sites com IA (imagem + vídeo + animação)

Skill orquestradora. Quando estiverem instaladas, chama nos pontos certos as skills `design-md` (extrair design de referência), `image-prompt-generator` (prompts de imagem) e, opcionalmente, `ui-ux-pro-max`, `tailwind-patterns` e uma skill de geração de imagem paga (ex.: `nano-banana`). Sem elas, faz o passo equivalente direto. E adiciona o que faltava: assets de vídeo, scroll cinematográfico, UI snapping (21st.dev) e pesquisa de conversão.

Filosofia (dos 7 níveis de Jack Roberts + técnica cinematográfica de Zubair Trabzada):
- Sites feios não são culpa do modelo: faltam contexto visual, skills de design e dados. Cada fase abaixo injeta um desses ingredientes.
- Conversão vem antes de estética ("Ferrari sem motor"): quando o site tem objetivo comercial, rodar a Fase 3.
- O modelo é multiplicador do contexto que recebe, não substituto dele.

## Fluxo (7 fases)

Fases 2 e 3 são opcionais. Perguntar a profundidade no intake, nunca em conta-gotas.

### Fase 1: Intake (sempre)

Fazer UMA mensagem de perguntas em lote (formato YOLO com veto, defaults preenchidos):
1. Projeto próprio ou cliente? Qual marca/negócio?
2. Objetivo do site (conversão/lead, portfólio, institucional, demo)?
3. Referência visual: URL de site admirado, screenshot, ou "me sugere" (nesse caso, indicar 2-3 candidatos de awwwards/godly/land-book, ver `references/inspiration-sources.md`)?
4. Profundidade: rodar design extraction (Fase 2)? Pesquisa de conversão (Fase 3)? Modo cinematográfico scroll-video (Fase 5c)?
5. Assets existentes (fotos, logo, manual de marca)? Nunca inventar identidade visual quando existe asset real.

### Fase 2: Design extraction (opcional, recomendada quando há URL de referência)

Extrair o blueprint de design do site de referência e construir POR CIMA dele (não copiar, elevar). Método completo em `references/design-extraction.md`. Resumo:
1. Rodar a skill `design-md` na URL (tokens.json + DESIGN.md + preview).
2. Complementar com um extraction blueprint verificável: tipografia (famílias, escala, pesos), cores (com hex), regras gerais de layout/espaçamento/motion, e o "conceito" do site (ex: "one page, one thought").
3. Verificar o blueprint contra a fonte antes de usar (cada afirmação deve ser checável no HTML/CSS real).

Com screenshot em vez de URL: anexar a imagem no contexto do build com a instrução "use esta imagem como referência de estilo".

### Fase 3: Pesquisa de conversão (opcional, recomendada para site comercial/cliente)

Sem ferramenta paga: usar WebSearch + WebFetch nativos. Método completo em `references/conversion-research.md`. Resumo: comparar ~10 sites vencedores vs ~10 medianos do nicho/região, extrair o que os vencedores têm em comum (ordem de seções, hero, CTAs), exigir matriz de scoring com evidência, e produzir um blueprint de conversão que a Fase 4 consome.

### Fase 4: Planejamento narrativo (sempre)

Anatomia em `references/prompt-anatomy.md`. Produzir um plano com:
1. **Fatos concretos da marca** (técnica do lore): números, nomes, specs, preços reais. Fatos concretos viram copy forte e microanimações; vagueza vira genérico. Para cliente real, usar SÓ fatos reais fornecidos (fato é sagrado, nada inventado).
2. **Narrativa seção a seção**: cada seção com propósito, conteúdo e efeito visual pretendido.
3. **Lista de assets**: imagem por imagem e vídeo por vídeo, cada um com seu prompt e specs.
4. Checkpoint com o usuário: aprovar plano + lista de assets antes de gerar qualquer coisa.

### Fase 5: Assets

Specs e templates em `references/image-video-assets.md`.

**5a. Imagens.** Default: gerar PROMPTS prontos (via skill `image-prompt-generator` quando o alvo é ChatGPT/gpt-image) e o usuário renderiza. Geração de imagem por API paga (ex.: `nano-banana`, fal.ai) custa dinheiro real por call: só rodar com autorização explícita de custo NAQUELE run ("pode gastar", "roda no nano banana"). Specs padrão: ratio 21:9 para heros/wide, resolução 2K, 2 a 4 variações por asset, fundo branco quando o asset entra recortado no site.

**5b. Vídeos (sempre manual).** O usuário não paga ferramenta de vídeo com API: entregar um prompt pack completo (um bloco por vídeo: modelo sugerido Seedance 2.0 ou Kling, prompt, start frame, end frame, ratio, enhanced prompt ON) para ele rodar em OpenArt/Higgsfield/etc. Truque chave: usar a MESMA imagem como start e end frame para loops fecharem perfeitos. Depois PAUSAR: pedir que ele jogue os arquivos gerados numa pasta `assets/raw/` do projeto e avise. Só então integrar.

**5c. Modo cinematográfico (scroll-video 3D).** O "site 3D" de awwwards raramente é WebGL: é um vídeo de alta qualidade fatiado em frames que avançam sincronizados ao scroll. Técnica completa (FFmpeg + canvas + template pronto) em `references/scroll-cinematic.md` e `assets/scroll-video-template.html`.

### Fase 6: Build

1. Stack default: HTML single-file + Tailwind CDN, mobile-first. React/Vite/Next só se o projeto pedir.
2. Invocar explicitamente o contexto de design: consultar `ui-ux-pro-max` (estilo, paleta, tipografia, animação) e `tailwind-patterns` durante o build. A instrução "use todas as skills e princípios de design relevantes" deve ser real, não decorativa: carregar e aplicar.
3. **UI snapping**: para efeitos e componentes prontos (hero animado, marquee, particles, cursor effects), buscar no 21st.dev (priorizar a aba "featured"), Magic UI ou CodePen; copiar o código/URL e integrar sem reengenharia. Guia em `references/inspiration-sources.md`.
4. Aplicar o blueprint da Fase 2 (design) e da Fase 3 (conversão) como lei do build.
5. Servir em localhost para conferência.

### Fase 7: Finalização

1. **Imagens**: rodar o pipeline WebP responsivo (Pillow + `<picture>` + manifesto: ~86% de redução mobile).
2. **Self-review visual obrigatório**: screenshot via Playwright (desktop + mobile viewport) e revisar contra o blueprint antes de mostrar. Design pobre em tela visível é bug bloqueante.
3. **Iterar editando, nunca regenerando**: o modelo é melhor em editar site construído do que em refazer do zero. Mudanças pontuais em conversa.
4. Deploy (Vercel) e domínio só quando o usuário pedir; git push é do fluxo normal do projeto.

## Regras transversais

- **Custo é gate**: nada que custe dinheiro (nano-banana, MCP pago) roda sem autorização explícita no run. Vídeo é sempre manual.
- **Fato é sagrado**: em site de cliente, copy e specs vêm de material real. Lore inventado só em projeto fictício/demo, declarado como tal.
- **Formato nomeado é lei**: se o usuário pediu "igual a referência X", o blueprint da referência manda; elevação criativa se declara antes, não se descobre depois.
- **Upgrades pagos documentados, não dependência**: Higgsfield MCP (geração one-shot de mídia) e Firecrawl (extração/pesquisa) estão descritos em `references/inspiration-sources.md` como caminho futuro se o usuário decidir pagar.

## Mapa de referências

| Arquivo | Quando carregar |
|---|---|
| `references/prompt-anatomy.md` | Fase 4, sempre |
| `references/image-video-assets.md` | Fase 5, sempre que houver asset |
| `references/scroll-cinematic.md` | Fase 5c, modo cinematográfico |
| `references/design-extraction.md` | Fase 2 |
| `references/conversion-research.md` | Fase 3 |
| `references/inspiration-sources.md` | Intake (sugerir referência), Fase 6 (UI snapping) |
| `assets/scroll-video-template.html` | Fase 5c, base do build cinematográfico |
