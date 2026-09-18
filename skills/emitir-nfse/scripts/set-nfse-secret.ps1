<#
.SYNOPSIS
  (Re)define a senha do gov.br (login do prestador) no cofre DPAPI local.

.DESCRIPTION
  Rodar UMA vez (ou quando trocar a senha no gov.br). Pede a senha de forma
  INTERATIVA (Read-Host -AsSecureString) — a senha NUNCA passa por argumento,
  histórico de comando ou pelo chat do agente. Criptografa com DPAPI (escopo
  CurrentUser: só este usuário do Windows decripta) e grava em
  %USERPROFILE%\.nfse\prestador.sec.

  IMPORTANTE: rodar no SEU terminal (PowerShell normal), não via agente, para a
  senha não tocar o contexto do Claude.

.EXAMPLE
  powershell -File set-nfse-secret.ps1   # Windows PowerShell 5.1 ou pwsh
#>
param(
  [string]$Dir = (Join-Path $env:USERPROFILE ".nfse"),
  [string]$File = "prestador.sec"
)

if (-not (Test-Path $Dir)) { New-Item -ItemType Directory -Force -Path $Dir | Out-Null }

$sec = Read-Host -AsSecureString "Senha do gov.br (CNPJ do prestador)"
if ($sec.Length -eq 0) { Write-Error "Senha vazia. Abortado."; exit 1 }

$enc = $sec | ConvertFrom-SecureString   # DPAPI CurrentUser
$path = Join-Path $Dir $File
Set-Content -Path $path -Value $enc -Encoding ASCII -NoNewline

# trava ACL só pro usuário atual
$acl = Get-Acl $Dir
$acl.SetAccessRuleProtection($true,$false)
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule($env:USERNAME,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
$acl.AddAccessRule($rule)
Set-Acl $Dir $acl

Write-Output "Senha salva criptografada em $path (DPAPI, só $env:USERNAME decripta)."
