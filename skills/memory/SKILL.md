---
name: memory
description: Memória entre sessões para o seu agente (Claude Code ou Codex), em arquivos markdown locais. Salva o resumo do que foi feito na sessão (objetivo, entregas, decisões, pendências, próximo passo) e, no começo de uma sessão nova, puxa o que foi feito nas anteriores. Use quando o usuário disser "/memory", "salva essa sessão", "marca onde paramos", "lembra disso", "o que a gente fez ontem?", "retoma de onde paramos", "carrega o contexto do projeto X", ou ao encerrar um trabalho relevante.
---

# Memory

Memória simples e auditável: tudo vira markdown numa pasta sua, que você pode abrir,
editar, versionar no git ou abrir como vault no Obsidian. Nada vai para servidor.

## Onde fica

`$AGENT_MEMORY_DIR` se a variável existir, senão `~/.agent-memory/`:

```
~/.agent-memory/
  index.md                      # uma linha por registro (o catálogo)
  sessions/2026-09-18-1430-landing-page-cliente.md
  facts/cliente-x-prefere-reuniao-de-manha.md
```

Toda escrita passa pelo script `scripts/mem.py` (mantém o `index.md` consistente).
Rode sempre com `python -X utf8 "<skill-dir>/scripts/mem.py" ...`.

## Comandos

### `/memory save` (fim de sessão ou marco importante)

1. Escreva o resumo da sessão neste formato, curto e factual:

   ```markdown
   ## Objetivo
   Uma frase.
   ## Feito
   - entregas concretas, com caminho de arquivo quando houver
   ## Decisões
   - decisão: motivo
   ## Pendências
   - o que ficou aberto e por quê
   ## Próximo passo
   Uma ação concreta para começar a próxima sessão.
   ```

2. Salve com:
   `python -X utf8 "<skill-dir>/scripts/mem.py" save --project <projeto> --title "<título curto>" --tags "tag1,tag2" --body-file <arquivo-temporário.md>`
   (`--project` = nome da pasta do projeto atual, se não houver outro óbvio.)
3. Responda em uma linha com o caminho salvo.

### `/memory learn <fato>` (algo que vale para sempre)

Para preferências, regras e decisões duráveis ("o cliente X só aprova por e-mail").
Antes, rode `search` com as palavras-chave: se já existe um fato parecido, **atualize
o arquivo existente** em vez de criar outro.

`python -X utf8 "<skill-dir>/scripts/mem.py" learn --project <projeto> --title "<fato em uma linha>" --body-file <arquivo.md>`

No corpo: o fato, **por que** ele importa e **como aplicar**. Datas relativas
("ontem", "semana que vem") viram datas absolutas.

### `/memory load [projeto]` (começo de sessão)

`python -X utf8 "<skill-dir>/scripts/mem.py" recent --project <projeto> -n 3`

Leia as sessões e os fatos listados e responda com: onde paramos, pendências
abertas e o próximo passo sugerido. Máximo 8 linhas. Sem projeto: use os 3
registros mais recentes de qualquer projeto.

### `/memory search <termo>`

`python -X utf8 "<skill-dir>/scripts/mem.py" search "<termo>"`

Mostra os registros que citam o termo. Leia os mais relevantes antes de responder.

## Regras

- **Nunca salve segredos**: senhas, tokens, chaves de API, dados bancários, CPF de
  terceiros. Se aparecerem na sessão, deixe fora do resumo.
- Só salve o que foi **feito ou decidido de verdade**. Nada de plano como se fosse
  entrega. Teste que falhou é pendência, não "feito".
- Memória envelhece: ao carregar um fato antigo que cita arquivo, número ou status,
  confira se ainda vale antes de usar como verdade.
- Um fato por arquivo em `facts/`. Sessões nunca são editadas depois de salvas: se
  algo mudou, a próxima sessão registra a mudança.

## Dica: carregar sozinho

Para o agente sempre começar sabendo onde parou, adicione ao seu `CLAUDE.md`
(Claude Code) ou `AGENTS.md` (Codex):

```
No início de cada sessão, rode /memory load para o projeto atual.
Ao terminar um trabalho relevante, rode /memory save.
```
