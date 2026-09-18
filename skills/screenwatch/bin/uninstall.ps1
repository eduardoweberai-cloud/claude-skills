<#
.SYNOPSIS
  Desliga o screenwatch: remove o launcher da pasta Inicializar e para o processo.
  Os dados (prints, notas) continuam na pasta base ate voce apagar.
#>
$startup = [Environment]::GetFolderPath('Startup')
Remove-Item (Join-Path $startup 'screenwatch-launch.vbs') -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like '*capture-loop.py*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Write-Output 'Screenwatch desligado. Os dados continuam na pasta base.'
