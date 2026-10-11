param([switch]$Check, [string]$Restore)
$ErrorActionPreference = 'Stop'
$skinRoot = Join-Path $env:LOCALAPPDATA 'CodexDreamSkin'
$nodePath = Join-Path $skinRoot 'engine\runtime\node\node.exe'
$scriptPath = Join-Path $PSScriptRoot 'install.cjs'
if ($Restore) { & $nodePath $scriptPath --restore $Restore }
elseif ($Check) { & $nodePath $scriptPath --check }
else { & $nodePath $scriptPath }
if ($LASTEXITCODE -ne 0) { throw 'Skin installation failed.' }
