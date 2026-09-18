<#
.SYNOPSIS
  Decodifica o JSON base64 produzido por um browser_evaluate fetch e salva o
  DANFSe (PDF) e/ou XML da NFS-e na pasta de notas.

.DESCRIPTION
  Uso APENAS quando o download programático estiver liberado (ver
  references/playbook.md, seção "Download programático"). Hoje o download é gated
  por hCaptcha e retorna 403 via fetch — neste caso, o usuário baixa manualmente.

  O fetch no navegador deve retornar uma string JSON com a forma:
    {"status":200,"type":"application/pdf","len":148357,"b64":"<base64>"}
  salva em um arquivo (via o parâmetro filename do browser_evaluate). Este script
  lê esse arquivo, valida status 200, decodifica o base64 e grava o binário.

.PARAMETER B64File
  Caminho do arquivo JSON (que contém a string com status/type/len/b64).

.PARAMETER Chave
  Chave de Acesso da NFS-e (vira o nome do arquivo de saída).

.PARAMETER Ext
  Extensão de saída: 'pdf' (DANFSe) ou 'xml'.

.PARAMETER Dest
  Pasta destino. Default: %USERPROFILE%\Downloads\NFSE

.EXAMPLE
  .\save-nfse-from-b64.ps1 -B64File danfse.b64.json -Chave <CHAVE_DE_ACESSO> -Ext pdf
#>
param(
  [Parameter(Mandatory=$true)][string]$B64File,
  [Parameter(Mandatory=$true)][string]$Chave,
  [Parameter(Mandatory=$true)][ValidateSet('pdf','xml')][string]$Ext,
  [string]$Dest = (Join-Path $env:USERPROFILE "Downloads\NFSE")
)

if (-not (Test-Path $B64File)) { throw "Arquivo não encontrado: $B64File" }

# O conteúdo pode ser uma string JSON (escapada) contendo outro JSON. Resolver até virar objeto.
$raw = Get-Content $B64File -Raw
$node = $raw | ConvertFrom-Json
if ($node -is [string]) { $obj = $node | ConvertFrom-Json } else { $obj = $node }

if ($obj.status -ne 200) {
  throw "Download não autorizado (status=$($obj.status), type=$($obj.type)). Provável hCaptcha/403 — baixar manualmente."
}
if (-not $obj.b64) { throw "Sem conteúdo base64 no JSON." }

$bytes = [System.Convert]::FromBase64String($obj.b64)

if (-not (Test-Path $Dest)) { New-Item -ItemType Directory -Force -Path $Dest | Out-Null }
$outPath = Join-Path $Dest "$Chave.$Ext"
[System.IO.File]::WriteAllBytes($outPath, $bytes)

# Sanity check do magic number
$magic = if ($Ext -eq 'pdf') { [System.Text.Encoding]::ASCII.GetString($bytes[0..3]) } else { [System.Text.Encoding]::UTF8.GetString($bytes[0..[Math]::Min(40,$bytes.Length-1)]) }
Write-Output "Salvo: $outPath ($($bytes.Length) bytes) | head: $magic"
