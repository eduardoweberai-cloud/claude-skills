# Fontes de inspiração e UI snapping

## Galerias de referência visual (intake / Fase 2)

| Fonte | Uso |
|---|---|
| awwwards.com | Sites premiados, registro "cinematic". Buscar "site of the day/year". Também via Google: "award-winning {nicho} site" |
| godly.website | Curadoria enxuta de sites astonishing, ótima para achar referência rápida |
| land-book.com | Landing pages por categoria, bom para nicho comercial |
| dribbble.com | Mood board: buscar por termo ("dashboard", "hero") ou pelo portfólio de estúdios (ex: Halo Lab) |
| mobbin.com | Padrões de UI mobile/app reais |

Como usar: escolher 1 referência principal (extraction, Fase 2) e opcionalmente 1-2 screenshots de apoio (anexar no build com "use as reference style").

## UI snapping: componentes e efeitos prontos (Fase 6)

Princípio: efeito de UI sofisticado não se reescreve do zero; pega-se pronto e integra-se. Fluxo do vídeo: copiar o código ou a URL do componente e pedir a integração pontual ("integrate this {feature} at the bottom of the page" + URL). Sem reengenharia.

| Fonte | O que tem | Nota |
|---|---|---|
| **21st.dev** | Componentes React/Tailwind com preview, código aberto | Priorizar a aba **"featured"** na lateral (curadoria de qualidade). Para stack HTML puro, adaptar: extrair a lógica CSS/JS do componente |
| Magic UI (magicui.design) | Efeitos animados (marquee, particles, shimmer, globe) React/Tailwind | Muitos efeitos portáveis para CSS puro |
| CodePen | Qualquer efeito em HTML/CSS/JS cru | Melhor fonte quando o build é single-file sem React |
| GSAP (greensock) | ScrollTrigger, timelines | Para scroll effects sérios sem vídeo; skills GSAP públicas existem no GitHub |

Ao integrar código de terceiros: conferir licença do snippet, remover dependências desnecessárias e adaptar tokens (cores/fontes) ao blueprint do projeto, nunca colar com o tema default.

## Skills de design públicas (instaláveis sob demanda)

Padrão do vídeo para instalar: colar a URL do repo GitHub e pedir para validar a qualidade da skill ANTES de adotar ("check out this skill, download it, add it to your skills": sempre com validação prévia).

- anthropics/claude-code: skill frontend-design oficial
- nextlevelbuilder: UI/UX Pro Max (JÁ INSTALADA como `ui-ux-pro-max`, não reinstalar)
- bergside/awesome-design-skills: índice de skills de design
- greensock: skills GSAP

## Upgrades pagos (documentados, NÃO são dependência)

Ambos os vídeos usam ferramentas pagas que esta skill substitui por rotas manuais/custo zero. Se o usuário decidir pagar um dia:

- **Higgsfield MCP** (Zubair): geração de imagem E vídeo (Seedance 2.0, Nano Banana Pro, GPT Image 2, Kling) direto do Claude, habilitando build one-shot com mídia inclusa. Setup: conta criada e logada ANTES, créditos carregados, conectar via "Add custom connector" com a URL MCP do site (aba MCP, opção Claude), OAuth, e conferir o toggle ligado antes de cada build. O prompt referencia o MCP pelo nome ("generate everything with Seedance 2.0 model on the Higgsfield MCP").
- **OpenArt** (Jack): hub manual de modelos de imagem/vídeo (Nano Banana 2, Kling, Seedance). É a rota "manual paga" que o prompt pack desta skill já assume.
- **Firecrawl MCP** (Jack): scraping/extração para brand identity e pesquisa de conversão em escala. A versão custo zero está em `references/conversion-research.md`.
