---
name: slide-creator
description: Cria apresentações a partir de um briefing, texto, transcrição, documento ou anotações soltas, com narrativa primeiro e design depois. Entrega o roteiro slide a slide, as notas do apresentador e o deck pronto em HTML (abre no navegador, navega pelo teclado) com exportação para PDF. Use quando o usuário pedir "cria uma apresentação", "monta slides", "faz um deck", "transforma isso em slides", "preciso apresentar X", pitch, aula, workshop, proposta comercial ou reunião de resultado.
---

# Slide Creator

Apresentação ruim quase nunca é problema de design. É slide sem função, título que
não diz nada e ordem que não leva a lugar nenhum. Por isso esta skill trabalha em
três passes, sempre nesta ordem: **história**, **slides**, **visual**. Só avança de
um passe para o outro quando o anterior está aprovado.

## Passo 0: briefing (perguntar antes de escrever)

Pergunte numa mensagem só, com um palpite padrão em cada item para o usuário só
vetar o que discordar:

1. **Para quem** é (quem vai estar na sala ou ler o PDF) e o que essa pessoa já sabe.
2. **O que ela deve fazer ou decidir** ao final. Uma frase. Se não houver ação, é
   um documento, não uma apresentação: diga isso.
3. **Formato**: apresentado ao vivo (pouco texto, a fala carrega) ou lido sozinho
   (mais texto, cada slide se explica).
4. **Tempo ou tamanho**: regra de bolso, 1 slide por minuto ao vivo.
5. **Material de origem** e **identidade visual** (cores, fonte, logo), se houver.

Se o usuário já trouxe isso tudo, não pergunte de novo.

## Passo 1: história

Escolha o arco que serve ao objetivo (detalhes em `references/narrativa.md`):

- **Problema, virada, prova, pedido**: vender, propor, pedir verba.
- **Situação, complicação, pergunta, resposta**: recomendar uma decisão.
- **Antes, depois, ponte**: mostrar transformação (caso, resultado).
- **Mapa, jornada, síntese**: ensinar (aula, workshop, onboarding).

Entregue a história como **uma lista de frases**, uma por slide, que lida em
sequência já conta a apresentação inteira. Esse é o teste: se as frases soltas não
fazem sentido juntas, os slides também não vão fazer. Peça aprovação.

## Passo 2: slides

Para cada frase aprovada, defina:

- **Título-conclusão**: uma frase completa com verbo que diz o que o slide prova
  ("O custo por lead caiu 38% em 60 dias"), nunca um rótulo ("Resultados").
- **Função**: um dos tipos do template (capa, seção, ideia, lista, número,
  comparação, citação, imagem, fechamento). Um slide, uma função.
- **Conteúdo**: o mínimo que sustenta o título. Ao vivo: até ~25 palavras além do
  título. Para leitura: até ~60.
- **Notas do apresentador**: o que falar, em 2 a 4 frases.

Entregue isso como tabela (nº, função, título, conteúdo, notas) e peça aprovação.

## Passo 3: visual e arquivo

1. Copie `templates/deck.html` para a pasta de trabalho com um nome novo e
   preencha os slides usando as classes já prontas do template (veja o comentário
   no topo do arquivo). Não invente CSS novo por slide.
2. Tema: ajuste só as variáveis em `:root` (cores, fontes). O padrão é escuro;
   para fundo claro, troque para o bloco `[data-theme="light"]` já incluído.
3. Imagens: use as que o usuário mandar. Se faltar imagem, deixe o espaço marcado
   com a descrição do que deveria ir ali, em vez de inventar.
4. Abra o HTML no navegador e confira cada slide. Setas ou espaço navegam, `F`
   liga tela cheia.
5. PDF (um slide por página, 16:9): veja `references/exportar.md`.

## Checklist antes de entregar

- [ ] Lendo só os títulos em sequência, a história fecha.
- [ ] Cada slide tem uma função e um título-conclusão.
- [ ] Nenhum slide com mais texto do que o limite do formato.
- [ ] Números têm fonte e data.
- [ ] O último slide diz o que fazer agora (o pedido), não só "Obrigado".
- [ ] Contraste legível e nada cortado no PDF.

## PowerPoint editável

Se o usuário precisar de `.pptx` editável, faça os passos 0 a 2 aqui e gere o
arquivo com a skill oficial `pptx` da Anthropic
(https://github.com/anthropics/skills), usando a tabela do passo 2 como roteiro.
