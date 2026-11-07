# Sets up the booker on this PC: Node.js, packages, browser, .env and the nightly task.
# Safe to run again: an existing .env is never changed.

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

function Stop-Setup($message) {
  Write-Output ''
  Write-Output "Setup stopped: $message"
  exit 1
}

function Get-NodeMajor {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { return 0 }
  return [int]((node --version) -replace '^v(\d+).*', '$1')
}

Write-Output 'Checking for Node.js...'
if ((Get-NodeMajor) -lt 21) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Stop-Setup 'Please install the LTS version of Node.js from https://nodejs.org, then run this again.'
  }
  Write-Output 'Installing Node.js. Windows may ask you to agree to its terms or allow the install.'
  winget install --id OpenJS.NodeJS.LTS -e
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
  if ((Get-NodeMajor) -lt 21) {
    Stop-Setup 'Node.js did not install. Please install the LTS version from https://nodejs.org, then run this again.'
  }
}

Write-Output 'Installing packages...'
npm.cmd install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Stop-Setup 'npm install failed. See the messages above.' }

Write-Output 'Installing the browser...'
npx.cmd playwright install chromium
if ($LASTEXITCODE -ne 0) { Stop-Setup 'The browser install failed. See the messages above.' }

Write-Output 'Setting up the nightly task...'
& (Join-Path $PSScriptRoot 'register-task.ps1')

$envFile = Join-Path $root '.env'
$isNew = -not (Test-Path $envFile)
if ($isNew) { Copy-Item (Join-Path $root '.env.example') $envFile }

Write-Output ''
Write-Output 'Setup is done. Next:'
if ($isNew) {
  Write-Output ' 1. Fill in your Plan2Play login in the Notepad window that just opened, then save.'
  Write-Output '    The email settings are optional. README.md explains them.'
} else {
  Write-Output ' 1. Your existing .env was left as it is.'
}
Write-Output ' 2. Double-click settings.cmd to choose days, times and courts.'
Write-Output ' 3. Double-click dry-run.cmd to test. It does not book anything.'
Write-Output ' 4. When you are ready to really book, change ALLOW_REAL_BOOKING to true in .env.'
Write-Output ' On booking nights keep this PC awake and plugged in, and stay logged in. Set its sleep time to Never.'
Write-Output ' INSTRUCTIONS.html has every step.'
if ($isNew) { Start-Process notepad.exe $envFile }
