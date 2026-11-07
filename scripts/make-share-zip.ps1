# Builds dist\PB-Registration-HP.zip to send to a friend. It holds only files tracked by git,
# which leaves out .env (your passwords), logs, screenshots and installed packages.
# config.json comes from git too, so your friend gets the defaults, not your own settings.

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$files = git ls-files
if ($LASTEXITCODE -ne 0) { Write-Output 'This needs git, to know which files are safe to share.'; exit 1 }
$files = $files | Where-Object { $_ -notlike '.github/*' }
if ($files | Where-Object { (Split-Path $_ -Leaf) -eq '.env' }) { Write-Output 'Stopped: .env is tracked by git, so it would be shared.'; exit 1 }

$stage = Join-Path ([IO.Path]::GetTempPath()) "pb-share-$PID\PB-Registration-HP"
New-Item -ItemType Directory -Force $stage | Out-Null
foreach ($file in $files) {
  $target = Join-Path $stage $file
  New-Item -ItemType Directory -Force (Split-Path $target -Parent) | Out-Null
  Copy-Item -LiteralPath (Join-Path $root $file) $target
}
git show HEAD:config.json | Set-Content -LiteralPath (Join-Path $stage 'config.json') -Encoding Ascii

$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null
$zip = Join-Path $dist 'PB-Registration-HP.zip'
Compress-Archive -Path $stage -DestinationPath $zip -Force
Remove-Item -Recurse -Force (Split-Path $stage -Parent)

Write-Output "Made $zip"
Write-Output 'Send that file to your friend. They unzip it and double-click setup.cmd.'
