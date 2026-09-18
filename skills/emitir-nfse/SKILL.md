---
name: emitir-nfse
description: 'Emite NFS-e (Nota Fiscal de Serviço Eletrônica) pelo Emissor Nacional (gov.br) via Playwright MCP, para qualquer empresa do Simples Nacional cujo município já usa o padrão nacional. Use quando o usuário pedir "emitir nota fiscal", "emitir NFS-e", "tira uma nota pra fulano" ou variações. A skill pergunta tomador, valor e data de competência, preenche as 4 abas do portal, PARA na revisão e só clica "Emitir NFS-e" depois do OK explícito. O download do DANFSe/XML fica com o usuário (o portal exige hCaptcha).'
---

# Emitir NFS-e (Emissor Nacional gov.br via Playwright)

Automatiza a emissão de NFS-e no Portal Nacional (`https://www.nfse.gov.br/EmissorNacional`)
usando o Playwright MCP. Pensada para quem emite as mesmas notas todo mês: o
prestador, o código de serviço e a tributação ficam fixos em `nfse.config.json`,
e a cada nota só mudam **tomador**, **valor** e **data de competência**.

## Antes do primeiro uso (setup, uma vez)

1. **Playwright MCP** instalado no Claude Code / Codex (`@playwright/mcp`).
2. Copie `config.example.json` para `nfse.config.json` (na pasta da skill) e
   preencha com os dados da SUA empresa. Veja `references/playbook.md` para o
   significado de cada campo.
3. **Valide os campos fiscais com o seu contador** (código de tributação, NBS,
   CST de PIS/COFINS, IBS/CBS). A skill só repete o que está na config: se a
   config estiver errada, todas as notas saem erradas.
4. Opcional (Windows): guarde a senha do gov.br num cofre criptografado rodando
   **no seu terminal** `powershell -File scripts/set-nfse-secret.ps1`. Sem o
   cofre, a skill pede para você digitar a senha na janela do navegador.
5. Opcional: copie `references/tomadores.example.md` para
   `references/tomadores.md` e cadastre seus clientes recorrentes.

Se `nfse.config.json` não existir, a skill NÃO abre o portal: ela ajuda o
usuário a preencher a config primeiro.

## Regra de ouro

**Trazer os dados → mostrar a revisão → emitir SÓ com aprovação explícita.**
Nunca clicar "Emitir NFS-e" sem o OK do usuário depois de ele revisar o resumo.

## Inputs a coletar (antes de abrir o portal)

Para cada nota:

1. **Tomador**: nome do cliente. Resolver pelo `references/tomadores.md` se
   existir; senão pedir o CNPJ (o portal puxa razão social e endereço pela lupa
   da Receita).
2. **Valor do serviço** em reais (ex.: R$ 2.000,00).
3. **Data de competência**: default = hoje. Confirmar.

Se o usuário já passou tudo na mensagem ("emite pra Cliente X, 2000, hoje"),
não re-perguntar: seguir para o preenchimento e a revisão.

## Workflow

Procedimento detalhado, selectors e pegadinhas em `references/playbook.md`.

1. **Login**: abrir `https://www.nfse.gov.br/EmissorNacional`. Se cair em
   `/Login`, pré-preencher o CNPJ da config e logar pelo cofre
   (`references/login-cofre.md`) ou pedir para o usuário digitar a senha e clicar
   Entrar na janela do Playwright.
2. **Emissão**: navegar para `/EmissorNacional/DPS/Pessoas`.
3. **Aba Pessoas**: IBS/CBS conforme a config (PRIMEIRO, ver pegadinha 13),
   data de competência via JS, regime de apuração, tomador no Brasil, CNPJ do
   tomador **digitado via teclado**, lupa, conferir razão social. Avançar.
4. **Aba Serviço**: município de prestação (buscar pelo nome da config no
   Select2, nunca injetar código), código de tributação (buscar na Select2),
   imunidade ISSQN = Não (marcar explícito), descrição e NBS da config. Avançar.
5. **Aba Valores**: valor via teclado, retenção de ISSQN, tipo de tributos,
   tributos aproximados, PIS/COFINS, tudo da config. Avançar.
6. **Aba Emitir**: extrair resumo + screenshot. **PARAR.** Mostrar a tabela de
   revisão (prestador, tomador, competência, serviço, valor, líquido) e pedir
   aprovação.
7. **Após aprovação**: clicar `#btnProsseguir` ("Emitir NFS-e"), capturar a
   **Chave de Acesso** da tela de sucesso e reportar.

Várias notas na mesma sessão: repetir o ciclo (o login persiste).

## Download do DANFSe/XML (fica com o usuário)

O download exige resolver um **hCaptcha**. A skill **não tenta resolver
captcha**: ela orienta o usuário a resolver e baixar na janela do Playwright,
salvando na pasta `pastas.notas` da config, com o nome = Chave de Acesso.

## Limites

- Só funciona para municípios que já aderiram ao Emissor Nacional. Se a sua
  cidade usa um portal próprio, a skill não serve.
- Testada para Simples Nacional. Outros regimes têm campos que a skill não cobre.
- O cofre de senha usa DPAPI (Windows). Em Mac/Linux, use o login manual.
