---
name: screenwatch
description: Analisa o arquivo de capturas de tela do screenwatch (Windows) para montar notas diárias de atividade, rastrear ineficiências recorrentes do seu fluxo de trabalho e sugerir otimizações concretas (atalhos, ferramentas, automações). Use para "/screenwatch setup", "/screenwatch analyze [data]", "/screenwatch optimize [foco]", "/screenwatch status", ou qualquer pergunta sobre o que o usuário fez num dia passado e como melhorar o fluxo dele com base no comportamento observado.
---

# Screenwatch

Duas partes:

1. **Capturador** (`bin/capture-loop.py`): roda escondido em segundo plano no
   Windows. A cada 5s, se você estiver usando o computador, grava qual app e qual
   janela estão em foco e, quando a janela muda (ou a cada 30s parado), salva um
   JPEG reduzido de cada monitor. Tudo fica **só no seu disco**. Nada é enviado
   para lugar nenhum pelo capturador.
2. **Esta skill**: lê esse arquivo quando você pede, monta a linha do tempo do
   dia, aponta ineficiências com evidência (qual print) e propõe o conserto.

## Privacidade (leia antes de ligar)

- O capturador tira prints da sua tela. Senhas digitadas não aparecem (campos de
  senha são mascarados), mas **tudo o que estiver visível aparece**: conversas,
  e-mails, dados de clientes, extratos.
- Quando você pede uma análise, a skill mostra alguns desses prints para o modelo
  de IA que você usa. Não rode análise em dias que tenham material que você não
  mandaria para o seu provedor de IA.
- Controles:
  - `exclude.txt` na pasta base: uma palavra por linha (ex.: `banco`, `1password`,
    `whatsapp`). Se o nome do app ou o título da janela contém uma delas, o
    capturador **não salva imagem** e grava o título como `[excluído]`.
  - Arquivo `PAUSE` na pasta base: enquanto existir, nada é capturado.
    `/screenwatch pause` cria, `/screenwatch resume` apaga.
  - Os prints somem sozinhos depois de 30 dias. As notas de análise ficam.

## Pasta base

`%SCREENWATCH_DIR%` se a variável existir, senão `%USERPROFILE%\screenwatch\`.
Abaixo, `<base>` = essa pasta.

## Estrutura dos dados

- `<base>\days\YYYY-MM-DD\log.jsonl`: uma linha por tick de 5s:
  `{t, epoch, app, window, url, img, screens, monitors}`. `screens` = monitores
  conectados naquele tick; `monitors` = nomes dos frames salvos (vazio quando
  `img` é false).
- `<base>\days\YYYY-MM-DD\HH-MM-SS-monN.jpg`: prints com ~1568px de largura, um
  por monitor. `monN` é o N-ésimo monitor na ordem do Windows naquele momento,
  não uma tela física fixa: use a janela ativa (`window`) como âncora de qual tela
  estava em foco.
- `<base>\notes\YYYY-MM-DD.md`: saída das análises (fica para sempre).
- `<base>\observations.md`: registro contínuo de ineficiências recorrentes, com contagem.
- `<base>\daemon.log`: erros e eventos do capturador.

`url` vem sempre vazio no Windows: o título da janela carrega o título da página,
o que costuma bastar.

## `setup`

1. Confirmar com o usuário que ele leu a seção de privacidade.
2. Rodar `powershell -ExecutionPolicy Bypass -File "<skill-dir>/bin/install.ps1"`.
   O script instala as dependências Python (`mss`, `psutil`, `pillow`), cria a
   pasta base, um `exclude.txt` inicial e um atalho escondido na pasta Inicializar
   do Windows (roda no logon, sem admin), e já liga o capturador.
3. Esperar ~1 minuto e rodar `status` para confirmar que há frames do dia.

Para desligar de vez: `powershell -File "<skill-dir>/bin/uninstall.ps1"` (remove
o atalho e para o processo; os dados continuam na pasta base até você apagar).

## Disciplina de custo (importante)

Metadado primeiro, visão depois. O `log.jsonl` responde quase tudo (quais apps,
quanto tempo, quantas trocas, quais janelas) por quase zero token. Só leia prints
onde o metadado não conta a história, e leia um por um. Meta: 10 a 30 imagens por
dia analisado, nunca todas. Agregue o log com um script `python` pelo shell em vez
de colar o JSONL no contexto.

## `analyze [data]` (default: ontem se tiver dados, senão hoje)

1. **Agregar o log**: juntar ticks em blocos de atividade (mesmo app + janela
   consecutivos), tempo total por app, duração dos blocos, trocas de contexto por
   hora, janelas mais usadas e "rajadas de troca" (mais de 6 trocas de app em 2 min).
2. **Escolher os frames que valem olhar**: transições entre blocos, os blocos mais
   longos e as rajadas. Ler esses prints.
3. **Procurar evidência de ineficiência**: menus abertos com o mouse onde existe
   atalho, navegação manual em janela de arquivos, copiar e colar repetido entre os
   mesmos dois apps, rolar documento longo procurando algo, ferramenta
   desatualizada, pilha de notificações, tarefa repetida que dá para automatizar,
   ficar conferindo status manualmente.
4. **Escrever `<base>\notes\YYYY-MM-DD.md`**: linha do tempo curta (blocos com
   horário), no que se trabalhou, inventário de ferramentas e a lista
   "Ineficiências observadas" com evidência concreta (nome do frame). Anotar também
   os padrões *bons* que valem manter.
5. **Atualizar `<base>\observations.md`**: para cada ineficiência, se já existe
   uma entrada parecida, somar a contagem e atualizar `last:`; senão, criar. Formato:
   `- [count: 3, last: 2026-07-08] Abre X pelo menu Iniciar, depois navegador, depois digita a URL; uma aba fixada ou atalho economizaria ~5s por vez. (Visto: 2026-07-06/14-22-10-mon1.jpg, ...)`

## `optimize [foco]`

1. Ler `observations.md` e as notas dos últimos ~7 dias.
2. Entradas com contagem 3 ou mais são padrão confirmado: transformar cada uma numa
   recomendação específica (o atalho exato, a ferramenta substituta, conferida na
   web se houver dúvida de que ainda é atual, ou uma automação que dá para montar
   na hora: script PowerShell, AutoHotkey, extensão, agente agendado).
3. Ordenar pelo tempo economizado por semana. Mostrar as 3 a 5 primeiras e
   oferecer implementar as automatizáveis.
4. Com `foco` (ex.: "navegador", "email"), filtrar para essa área.

## `status`

Informar se o capturador está rodando
(`Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*capture-loop.py*' }`),
se o arquivo `PAUSE` existe, quantos frames há hoje e quanto espaço ocupam em
`<base>\days\<hoje>\`, e os erros recentes do `daemon.log`.

## `pause` / `resume`

Criar ou apagar o arquivo `<base>\PAUSE`. Confirmar em uma linha.
