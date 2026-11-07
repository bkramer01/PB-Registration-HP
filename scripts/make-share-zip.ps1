# Builds two zips to send to a friend, in dist\:
#   PB-Registration-HP.zip      for a Windows PC (the Mac files are left out)
#   PB-Registration-HP-Mac.zip  for a Mac (the Windows files are left out)
# They hold only files tracked by git, which leaves out .env (your passwords), logs,
# screenshots and installed packages. config.json comes from git too, so your friend
# gets the defaults, not your own settings.

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$files = git ls-files
if ($LASTEXITCODE -ne 0) { Write-Output 'This needs git, to know which files are safe to share.'; exit 1 }
$files = $files | Where-Object { $_ -notlike '.github/*' }
if ($files | Where-Object { (Split-Path $_ -Leaf) -eq '.env' }) { Write-Output 'Stopped: .env is tracked by git, so it would be shared.'; exit 1 }

# git lists paths with forward slashes.
$macOnly = '(\.command$|^scripts/mac/|^INSTRUCTIONS-MAC\.html$)'
$windowsOnly = '(\.cmd$|\.ps1$|^INSTRUCTIONS\.html$)'

$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null

# Copies every shared file except those matching $leaveOut, then zips them.
function New-ShareZip($zipName, $leaveOut) {
  $stage = Join-Path ([IO.Path]::GetTempPath()) "pb-share-$PID\PB-Registration-HP"
  New-Item -ItemType Directory -Force $stage | Out-Null
  foreach ($file in ($files | Where-Object { $_ -notmatch $leaveOut })) {
    $target = Join-Path $stage $file
    New-Item -ItemType Directory -Force (Split-Path $target -Parent) | Out-Null
    Copy-Item -LiteralPath (Join-Path $root $file) $target
  }
  git show HEAD:config.json | Set-Content -LiteralPath (Join-Path $stage 'config.json') -Encoding Ascii
  $zip = Join-Path $dist $zipName
  Compress-Archive -Path $stage -DestinationPath $zip -Force
  Remove-Item -Recurse -Force (Split-Path $stage -Parent)
  Write-Output "Made $zip"
}

New-ShareZip 'PB-Registration-HP.zip' $macOnly
New-ShareZip 'PB-Registration-HP-Mac.zip' $windowsOnly

Write-Output ''
Write-Output 'For a friend with a Windows PC, send PB-Registration-HP.zip. They unzip it and open INSTRUCTIONS.html.'
Write-Output 'For a friend with a Mac, send PB-Registration-HP-Mac.zip. They unzip it and open INSTRUCTIONS-MAC.html.'
