# Pesquisa de conversão (nível 6)

Fonte: Jack Roberts. Vem ANTES da estética em importância: "um site lindo que não converte é uma Ferrari sem motor". O site nasce do dado do nicho: não copiando concorrente, mas usando os padrões dos vencedores como blueprint.

No vídeo ele usa Firecrawl MCP; aqui a versão custo zero usa WebSearch + WebFetch nativos (mesma lógica, coleta manual). Se um dia houver Firecrawl: instruir explicitamente "use the Firecrawl MCP" no prompt.

## Método

### 1. Montar a amostra (WebSearch)

- ~10 sites "vencedores" do nicho/região: quem aparece no topo orgânico + quem anuncia consistentemente (anúncio recorrente = página que paga a conta) + referências nacionais/globais do segmento.
- ~10 sites medianos/perdedores do mesmo nicho: resultados de páginas 2-3, sites visivelmente datados.
- Registrar a lista com URL e critério de classificação de cada um (evidência, não achismo).

### 2. Analisar cada site (WebFetch)

Extrair de cada um: ordem das seções, o que há no hero (headline, imagem vs vídeo, presença de CTA), quantos e quais CTAs (texto literal do botão), prova social (tipo e posição), formulário (campos, posição), preço exposto ou não.

### 3. Comparar e pontuar

- O que os vencedores têm em comum que os perdedores não têm? (padrões de ordem de seção, hero com imagem+CTA, tipo de CTA)
- Construir uma MATRIZ DE SCORING explícita: critérios, peso e nota de cada site, com evidência por célula. A matriz força o raciocínio a ser auditável.
- Cross-validação: quando a decisão for cara (site de cliente), validar as conclusões numa segunda passada independente (outro agente/modelo revisando a matriz contra as evidências).

### 4. Output: blueprint de conversão

```
## Conversion Blueprint: {nicho} {região}
- Ordem de seções recomendada (com % de vencedores que a usam)
- Hero: fórmula (headline de X tipo + visual Y + CTA "Z")
- CTA primário: texto, cor de destaque, repetições na página
- Prova social: tipo (logos/depoimentos/números) e posição
- Formulário: nº de campos, posição
- Anti-padrões: o que os perdedores fazem e deve ser evitado
- Evidências: lista site a site
```

Este blueprint entra na Fase 4 como restrição da narrativa (a ordem das seções e o CTA saem daqui, não do gosto).

## Uso secundário: brand identity de referência

Padrão do vídeo, adaptado sem Firecrawl: "vá em {site da marca}, extraia a identidade (cores, tipografia, logo) e atualize o site de acordo". Com WebFetch + design-md cobre o mesmo caso.
