# Anatomia do plano narrativo (técnica do lore)

Fonte: workflow de Zubair Trabzada (site "Abyssal", vídeo "Claude Fable 5 Built a $10K Website in Minutes") + níveis 1-3 de Jack Roberts.

## Por que funciona

O modelo transforma fatos concretos em copy, specs visuais e microanimações sem instrução extra. No exemplo Abyssal, o lore "empresa de expedição submarina, leva 8 civis por ano, submarino Erebus, USD 250.000 por assento, 96h de life support, rating de 4.000 m" virou: seção de specs com números animados, scroll indicator lateral de profundidade e um farol que acende na escuridão. Nada disso foi pedido; tudo emergiu dos fatos.

Vagueza produz genérico. "Uma empresa de tecnologia inovadora" gera site de template. "Padaria de fermentação natural que entrega pão quente de bicicleta num raio de 3 km, desde 2012" gera site com substância.

## Estrutura do plano (produzir na Fase 4)

```
1. IDENTIDADE
   - Marca, tagline, tom de voz
   - Blueprint de design (da Fase 2, se houver) ou direção estética escolhida

2. FATOS CONCRETOS (mínimo 6-10)
   - Números: anos, clientes, capacidade, preço, métricas
   - Nomes próprios: produtos, tecnologias, locais
   - Specs: dimensões, prazos, garantias
   - REGRA: cliente real = só fatos fornecidos/verificados. Projeto demo = lore
     inventado declarado como fictício.

3. NARRATIVA SEÇÃO A SEÇÃO
   Para cada seção: nome, propósito (o que o visitante deve sentir/fazer),
   conteúdo (quais fatos entram), efeito visual pretendido (e de onde vem:
   21st.dev, scroll-video, CSS puro).
   Padrão do Abyssal que funciona: seções como "zonas" de uma jornada
   (superfície, zona de luz, zona crepuscular...) em vez de blocos genéricos
   (hero, features, about).

4. LISTA DE ASSETS
   Por asset: id, tipo (imagem/vídeo), seção de destino, prompt completo,
   specs (ratio, resolução), start/end frame quando vídeo.

5. CTA E CONVERSÃO
   Blueprint da Fase 3 quando houver; senão, 1 objetivo único por página
   (Single Goal), CTA visível no hero em 5 segundos.
```

## Frases que mudam o resultado (usar literalmente no build)

- "Build an award-winning cinematic {tipo} website for {marca}" (âncora de qualidade: "award-winning" puxa o registro visual de awwwards).
- "Studied the style of Awwwards site of the year, huge bold typography, cinematic scroll visuals" (variante portfólio: com 1 foto do usuário como único input).
- "Use this image as a reference style for how I'd like the website to look" (ao anexar screenshot de referência).
- "Use all the best skills and design principles; make sure you're using all relevant skills for building beautiful design" (e efetivamente carregar ui-ux-pro-max e tailwind-patterns, não só declarar).
- "Create something similar to this website: {URL}" (clonagem leve, sem extraction; para extraction séria usar a Fase 2).

## Checkpoint obrigatório

Apresentar o plano completo (identidade + fatos + narrativa + lista de assets) e obter aprovação ANTES de gerar qualquer asset ou escrever código. Um plano aprovado é lei durante o build.
