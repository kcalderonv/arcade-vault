$ErrorActionPreference = 'SilentlyContinue'
$root = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Resolve-Path "$PSScriptRoot\..\..").Path }
$mp3 = Join-Path $root 'resources\claudecode-finished.mp3'
if (-not (Test-Path $mp3)) { exit 0 }

Add-Type -AssemblyName presentationCore
$player = New-Object System.Windows.Media.MediaPlayer
$player.Open([Uri]$mp3)

# Esperar a que cargue la duración (máx. 3 s) y luego reproducir hasta el final (máx. 10 s)
$i = 0
while (-not $player.NaturalDuration.HasTimeSpan -and $i -lt 30) { Start-Sleep -Milliseconds 100; $i++ }
$player.Play()
$ms = if ($player.NaturalDuration.HasTimeSpan) { [int]$player.NaturalDuration.TimeSpan.TotalMilliseconds + 300 } else { 5000 }
Start-Sleep -Milliseconds ([Math]::Min($ms, 10000))
$player.Close()
exit 0
