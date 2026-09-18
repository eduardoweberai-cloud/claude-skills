# Design extraction (nível 7)

Fonte: nível mais forte do Jack Roberts. Extrair o blueprint de design de um site admirado e construir POR CIMA dele: não é cópia, é usar o sistema de design de referência como piso e elevar com o conteúdo próprio. Resultado demonstrado: site one-shot sem edição posterior.

## Critério de escolha da referência

- "One page, one thought": uma ideia por tela, interatividade que serve a narrativa sem distrair (exemplo usado no vídeo: antigravity.google).
- A referência deve ser do MESMO registro do projeto (produto tech, portfólio, industrial). Extrair um design de SaaS para um site industrial produz enxerto estranho.
- Se o usuário não tem referência: sugerir 2-3 candidatos (ver `references/inspiration-sources.md`) e deixar ele escolher.

## Pipeline

### 1. Extração mecânica: skill `design-md`

Rodar a skill `design-md` na URL. Ela devolve DESIGN.md spec Google + `tokens.json` + preview + lint, via análise estática (sem headless browser). Gotcha conhecido: ela perde cores inline/JS-injected; validar o resultado contra screenshot real do site.

### 2. Extraction blueprint verificável (complemento cognitivo)

O que a extração mecânica não captura, descrever manualmente num blueprint com estas seções, cada afirmação checável contra o HTML/CSS ou screenshot real:

```
## Extraction Blueprint: {site}
1. TIPOGRAFIA: famílias (display/body/mono), escala (h1 até caption com px/rem),
   pesos usados, letter-spacing e line-height característicos.
2. COR: paleta completa com hex, proporção de uso (dominante/apoio/acento),
   como o acento é gasto (só CTA? links? detalhes?).
3. LAYOUT: grid, larguras máximas, ritmo de espaçamento vertical entre seções,
   densidade (quanto respiro).
4. MOTION: o que anima, com que trigger (scroll, hover, load), duração e easing
   percebidos, o que NUNCA anima.
5. CONCEITO: a regra editorial do site em 1 frase (ex: "one page, one thought";
   "tipografia gigante faz o trabalho da imagem").
6. VERIFICAÇÃO: para cada item acima, a evidência (seletor CSS, screenshot,
   computed style via Playwright quando necessário).
```

Sem screenshot disponível estaticamente: usar Playwright MCP para navegar, tirar screenshot e inspecionar computed styles.

### 3. Uso no build

Prompt de build no espírito do vídeo: "Segue o extraction blueprint em anexo. Construa um site para {tema} que entenda a tipografia, as cores e as regras de design dessa referência e ELEVE isso um nível". O blueprint entra como lei: qualquer desvio criativo se declara antes.

## Variante rápida (sem extraction)

Quando o usuário quer velocidade e não fidelidade: screenshot da referência anexado ao prompt de build com "use this image as a reference style". Funciona bem (nível 2), mas produz aproximação, não sistema.
