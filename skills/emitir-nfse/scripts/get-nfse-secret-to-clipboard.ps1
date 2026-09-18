<#
.SYNOPSIS
  Decripta a senha do cofre DPAPI e coloca na área de transferência (clipboard).

.DESCRIPTION
  Chamado pela skill emitir-nfse na etapa de login. Decripta o blob DPAPI e usa
  Set-Clipboard, para que a skill cole a senha no campo via Ctrl+V SEM a senha
  aparecer no output/transcript do agente. Após colar, a skill deve limpar o
  clipboard (clear-nfse-clipboard ou Set-Clipboard -Value ' ').

  NÃO imprime a senha. Só confirma sucesso e o comprimento.

.EXAMPLE
  pwsh -File get-nfse-secret-to-clipboard.ps1
#>
param(
  [string]$Path = (Join-Path $env:USERPROFILE ".nfse\prestador.sec")
)

if (-not (Test-Path $Path)) {
  Write-Error "Cofre não encontrado em $Path. Rode set-nfse-secret.ps1 primeiro."
  exit 1
}

try {
  $enc = Get-Content $Path -Raw
  $sec = $enc | ConvertTo-SecureString   # DPAPI: só o mesmo usuário Windows decripta
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  $pw = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  Set-Clipboard -Value $pw
  $len = $pw.Length
  $pw = $null
  Write-Output "Senha no clipboard (length=$len). Colar com Ctrl+V e limpar o clipboard depois."
} catch {
  Write-Error "Falha ao decriptar (DPAPI exige o mesmo usuário Windows que salvou): $($_.Exception.Message)"
  exit 1
}
