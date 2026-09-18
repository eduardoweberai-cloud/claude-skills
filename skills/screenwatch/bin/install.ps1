<#
.SYNOPSIS
  Instala o capturador do screenwatch (Windows, sem admin).

.DESCRIPTION
  - instala as dependencias Python (mss, psutil, pillow) no usuario
  - cria a pasta base (SCREENWATCH_DIR ou %USERPROFILE%\screenwatch)
  - copia capture-loop.py para <base>\bin
  - cria <base>\exclude.txt com termos iniciais (apps que nunca viram print)
  - cria um launcher .vbs escondido e coloca na pasta Inicializar (roda no logon)
  - liga o capturador agora

  Para desligar: uninstall.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File install.ps1
  powershell -ExecutionPolicy Bypass -File install.ps1 -Base D:\screenwatch
#>
param(
  [string]$Base = $(if ($env:SCREENWATCH_DIR) { $env:SCREENWATCH_DIR } else { Join-Path $env:USERPROFILE 'screenwatch' })
)
$ErrorActionPreference = 'Stop'

$py = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $py) { throw 'Python nao encontrado no PATH. Instale o Python 3.10+ (python.org, marcando "Add to PATH") e rode de novo.' }
$pyw = Join-Path (Split-Path $py) 'pythonw.exe'
if (-not (Test-Path $pyw)) { throw "pythonw.exe nao encontrado ao lado de $py" }

Write-Output 'Instalando dependencias (mss, psutil, pillow)...'
& $py -m pip install --user --quiet mss psutil pillow
if ($LASTEXITCODE -ne 0) { throw 'Falha no pip install.' }

$binDir = Join-Path $Base 'bin'
New-Item -ItemType Directory -Force -Path (Join-Path $Base 'days') | Out-Null
New-Item -ItemType Directory -Force -Path $binDir | Out-Null
Copy-Item (Join-Path $PSScriptRoot 'capture-loop.py') $binDir -Force
$loop = Join-Path $binDir 'capture-loop.py'

$excl = Join-Path $Base 'exclude.txt'
if (-not (Test-Path $excl)) {
  Set-Content -Path $excl -Encoding UTF8 -Value @(
    '# Um termo por linha. Se o nome do app ou o titulo da janela contem o termo,',
    '# o screenwatch NAO salva print e grava o titulo como [excluido].',
    '1password',
    'bitwarden',
    'keepass',
    'banco',
    'internet banking'
  )
}

# Pasta base fora do padrao: guardar em variavel de ambiente do usuario para o daemon achar no logon
if ($Base -ne (Join-Path $env:USERPROFILE 'screenwatch')) {
  [Environment]::SetEnvironmentVariable('SCREENWATCH_DIR', $Base, 'User')
}

$vbs = Join-Path $Base 'screenwatch-launch.vbs'
$line = 'CreateObject("WScript.Shell").Run """' + $pyw + '"" ""' + $loop + '""", 0, False'
Set-Content -Path $vbs -Encoding Unicode -Value $line

$startup = [Environment]::GetFolderPath('Startup')
Copy-Item $vbs (Join-Path $startup 'screenwatch-launch.vbs') -Force

$running = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*capture-loop.py*' }
if (-not $running) { Start-Process wscript.exe -ArgumentList "`"$vbs`"" }

Write-Output "Screenwatch instalado e rodando. Pasta base: $Base"
Write-Output "Edite $excl para excluir apps/janelas. Crie o arquivo $Base\PAUSE para pausar."
