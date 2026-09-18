# Playbook: emissão de NFS-e no Emissor Nacional (gov.br) via Playwright MCP

Procedimento operacional validado em campo no portal v1.6.0.0 (ago/2026). Tudo que
é específico da sua empresa vem de `nfse.config.json`; aqui ficam os selectors,
a ordem dos passos e as pegadinhas do portal.

## Campos da config

| Campo | O que é |
|-------|---------|
| `prestador.cnpj` | CNPJ da sua empresa, só dígitos. É o login do portal. |
| `prestador.municipio_busca` | Trecho do nome da cidade de prestação, como você digitaria na busca (ex.: `Porto Aleg`). |
| `prestador.municipio_codigo_esperado` | Código IBGE que o portal mostra para essa cidade. Serve para conferir a seleção. |
| `servico.codigo_tributacao_busca` | O que digitar na busca do código de tributação nacional (ex.: `0107`). |
| `servico.codigo_tributacao_esperado` | Código completo esperado após a seleção (ex.: `01.07.01`). |
| `servico.descricao` | Texto da descrição do serviço na nota. |
| `servico.nbs` | Código NBS do serviço (9 dígitos). |
| `tributacao.preencher_ibs_cbs` | `false` = "Não" no campo novo de IBS/CBS (reforma tributária). Confirme com o contador. |
| `tributacao.regime_apuracao_value` | `1` = "Regime de apuração dos tributos federais e municipal pelo Simples Nacional". |
| `tributacao.issqn_retido_pelo_tomador` | `false` = sem retenção de ISSQN. |
| `tributacao.tipo_valor_tributos_value` | `1` = "Preencher os valores monetários em cada NFS-e emitida". |
| `tributacao.tributos_aproximados` | Valores de tributos aproximados (Lei da Transparência). |
| `tributacao.pis_cofins_situacao_value` | Valor interno do select de CST PIS/COFINS no portal. `1` = "01 - Operação Tributável com Alíquota Básica". Confirme o CST correto com o contador. |
| `tributacao.pis_cofins_retencao_value` | `0` = "PIS/COFINS/CSLL Não Retidos". |

## Selectors confirmados (DOM IDs)

```yaml
login:
  cnpj: '#Inscricao'
  senha: '#Senha'

aba_pessoas:
  ibs_cbs_nao: 'input[name="PreencherInfoIBSCBS"][value="0"]'   # marcar PRIMEIRO (abre modal jconfirm, clicar SIM)
  data_competencia: '#DataCompetencia'                          # setar via JS (pula modal)
  regime_apuracao: '#SimplesNacional_RegimeApuracaoTributosSN'  # select Chosen
  tomador_brasil: 'input[name="Tomador.LocalDomicilio"][value="1"]'
  tomador_cnpj: '#Tomador_Inscricao'                            # DIGITAR via teclado (máscara)
  tomador_btn_pesquisar: '#btn_Tomador_Inscricao_pesquisar'     # lupa: puxa razão/endereço
  tomador_nome_confirm: '#Tomador_Nome'
  tomador_informar_endereco: '#Tomador_InformarEndereco'
  btn_avancar: 'button:has-text("Avançar")'

aba_servico:
  municipio_prestacao: '#LocalPrestacao_CodigoMunicipioPrestacao'   # Select2 AJAX (buscar nome)
  codigo_tributacao: '#ServicoPrestado_CodigoTributacaoNacional'    # Select2 AJAX
  imunidade_nao: 'input[name="ServicoPrestado.HaExportacaoImunidadeNaoIncidencia"][value="0"]'
  descricao: '#ServicoPrestado_Descricao'
  nbs: '#ServicoPrestado_CodigoNBS'                                 # select Chosen

aba_valores:
  valor_servico: '#Valores_ValorServico'                           # DIGITAR via teclado (máscara)
  issqn_retencao_nao: 'input[name="ISSQN.HaRetencao"][value="0"]'
  tipo_tributos: 'input[name="ValorTributos.TipoValorTributos"]'
  valor_federal: '#ValorTributos_ValorTotalFederal'
  valor_estadual: '#ValorTributos_ValorTotalEstadual'
  valor_municipal: '#ValorTributos_ValorTotalMunicipal'
  pis_situacao: '#TributacaoFederal_PISCofins_SituacaoTributaria'  # select Chosen
  pis_retencao: '#TributacaoFederal_PISCofins_TipoRetencao'        # select Chosen

aba_emitir:
  btn_emitir: '#btnProsseguir'   # "Emitir NFS-e": só clicar APÓS aprovação do usuário
```

## Snippets JS validados (browser_evaluate)

Troque os valores entre `<>` pelos da config.

### Aba Pessoas

Ordem obrigatória: IBS/CBS **primeiro** (o clique abre o modal "os demais dados
serão perdidos", clicar SIM). Marcar IBS/CBS depois limpa data e CNPJ.

```js
// 0) IBS/CBS = Não (antes de tudo). Depois: se .jconfirm-open existir, clicar "SIM".
const ibs = document.querySelector('input[name="PreencherInfoIBSCBS"][value="0"]');
ibs.disabled=false; jQuery(ibs).prop('checked',true).trigger('click').trigger('change');
// 1) Data de competência via JS (pula o modal)
const dc = document.querySelector('#DataCompetencia');
dc.value = '<DD/MM/AAAA>';
['input','change','blur'].forEach(e => dc.dispatchEvent(new Event(e,{bubbles:true})));
// aguardar ~1.5s o emitente carregar, depois:
const reg = document.querySelector('#SimplesNacional_RegimeApuracaoTributosSN');
reg.value='<regime_apuracao_value>'; jQuery(reg).trigger('chosen:updated').trigger('change');
const br = document.querySelector('input[name="Tomador.LocalDomicilio"][value="1"]');
br.disabled=false; jQuery(br).prop('checked',true).trigger('click').trigger('change');
```

Depois: CNPJ do tomador **digitado via teclado** (`browser_type` slowly) e clique
na lupa.

### Aba Serviço (após os dois Select2)

```js
const imm = document.querySelector('input[name="ServicoPrestado.HaExportacaoImunidadeNaoIncidencia"][value="0"]');
imm.disabled=false; jQuery(imm).prop('checked',true).trigger('click').trigger('change');
const desc = document.querySelector('#ServicoPrestado_Descricao');
desc.value='<servico.descricao>';
['input','change'].forEach(e => desc.dispatchEvent(new Event(e,{bubbles:true})));
const nbs = document.querySelector('#ServicoPrestado_CodigoNBS');
nbs.value='<servico.nbs>'; jQuery(nbs).trigger('chosen:updated').trigger('change');
```

### Aba Valores

```js
// se issqn_retido_pelo_tomador = false
const ret = document.querySelector('input[name="ISSQN.HaRetencao"][value="0"]');
ret.disabled=false; jQuery(ret).prop('checked',true).trigger('click').trigger('change');
const tvt = document.querySelector('input[name="ValorTributos.TipoValorTributos"][value="<tipo_valor_tributos_value>"]');
jQuery(tvt).prop('checked',true).trigger('click').trigger('change');
const ps = document.querySelector('#TributacaoFederal_PISCofins_SituacaoTributaria');
ps.value='<pis_cofins_situacao_value>'; jQuery(ps).trigger('chosen:updated').trigger('change');
const pr = document.querySelector('#TributacaoFederal_PISCofins_TipoRetencao');
pr.value='<pis_cofins_retencao_value>'; jQuery(pr).trigger('chosen:updated').trigger('change');
```

O valor do serviço e os três tributos aproximados: **digitar via teclado** (máscara monetária).

## Select2 AJAX (município e código de tributação)

Nenhum dos dois vem com opções carregadas.

1. Clicar o container: `#<id> + span.select2 .select2-selection`.
2. Confirmar que `.select2-search__field` abriu e está focado.
3. **Digitar via teclado** (`browser_type` slowly): eventos sintéticos NÃO
   disparam o AJAX.
   - Município: digitar `municipio_busca`, aguardar, escolher a cidade, Enter.
   - Tributação: digitar `codigo_tributacao_busca`, aguardar, escolher, Enter.
4. Conferir o `value` do `<select>` contra `municipio_codigo_esperado` e
   `codigo_tributacao_esperado`. Divergiu: parar e avisar.

## Pegadinhas do portal

1. **CNPJ do tomador precisa ser DIGITADO.** Setar `.value` via JS não ativa a
   máscara nem a lupa. Limpar, dar `focus` e digitar via teclado.
2. **Data de competência via JS pula o modal.** Digitar via teclado dispara o
   aviso "os dados serão perdidos". Use sempre JS nesse campo.
3. **Município: sempre buscar pelo nome, nunca injetar código.** A busca elimina
   o risco de código errado.
4. **Imunidade ISSQN não vem marcada.** O Avançar falha com "Campo obrigatório".
   Marcar "Não" explicitamente.
5. **Radios começam `disabled`.** Forçar `.disabled=false` antes de marcar.
6. **O Playwright não é o seu navegador.** É um Chromium isolado: o login
   acontece dentro da janela dele.
7. **ISSQN/PIS/COFINS aparecem R$ 0,00 na prévia.** No Simples Nacional eles são
   apurados no DAS. Não é erro.
8. **CEP genérico do tomador rejeitado ("CEP inexistente").** Alguns CNPJs vêm da
   Receita com CEP genérico de cidade. Solução: desmarcar
   `#Tomador_InformarEndereco` e limpar o CEP (o tomador segue identificado pelo
   CNPJ). Desmarcar via `cb.checked=false; jQuery(cb).trigger('change')` (NÃO
   `.trigger('click')`, que marca de novo).
9. **A sessão pode expirar bem no "Emitir".** O POST PODE ter passado mesmo
   caindo no `/Login`. **Re-logar e conferir em `/EmissorNacional/Notas/Emitidas`
   antes de reemitir.** Nunca reclicar às cegas: risco de nota duplicada.
10. **Colar a senha às vezes duplica o valor.** Limpar o campo antes
    (`#Senha.value=''; focus()`) e conferir `value.length` depois.
11. **Nunca tirar snapshot com a senha preenchida.** `browser_snapshot`,
    `browser_find` e `browser_click` por ref devolvem o `value` do campo de senha
    em texto claro no transcript. Depois de colar, clicar Entrar por selector CSS
    (`button:has-text("Entrar")`) e validar só `value.length` via `evaluate`.
    Se a senha vazar, troque no gov.br.
12. **Portal instável (503).** Se o login cair em 503, a sessão não foi criada:
    repetir. Senha errada aparece como "Usuário e/ou senha inválidos".
13. **Campo IBS/CBS (portal v1.6.0.0).** "Preencher as informações IBS/CBS?" é
    obrigatório. "Sim" abre um bloco de classificação e alíquotas que esta skill
    NÃO cobre. Efeitos colaterais: o clique abre o modal de "dados perdidos"
    (clicar SIM), e um Avançar sem ele marcado limpa a data de competência
    (repor via JS).

## Tela de sucesso

A URL vira `/EmissorNacional/DPS/NFSe?...` com "A NFS-e foi gerada com sucesso", a
**Chave de Acesso** e os links "Baixar XML" / "Baixar DANFSe".

## Download (gated por hCaptcha)

`fetch()` e navegação direta nas URLs de download devolvem 403. Só o clique
humano, com o hCaptcha resolvido, libera. A skill orienta o usuário a baixar e
salvar em `pastas.notas` com o nome da Chave de Acesso.

Se algum dia o portal liberar download programático, `scripts/save-nfse-from-b64.ps1`
decodifica o retorno de um `fetch(url,{credentials:'include'})` convertido em
base64. URLs:

```
https://www.nfse.gov.br/EmissorNacional/Notas/Download/DANFSe/<CHAVE>   # PDF
https://www.nfse.gov.br/EmissorNacional/Notas/Download/NFSe/<CHAVE>     # XML
```
