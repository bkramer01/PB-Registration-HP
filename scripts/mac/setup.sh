#!/bin/bash
# Sets up the booker on this Mac: Node.js, packages, browser, .env and the nightly job.
# Safe to run again: an existing .env is never changed.
source "$(dirname "$0")/common.sh"
cd "$ROOT" || exit 1

stop_setup() {
  echo
  echo "Setup stopped: $1"
  exit 1
}

if in_protected_folder; then
  stop_setup "this folder is in Documents, Desktop, Downloads or iCloud Drive, where macOS
won't let the nightly job read it. In Finder, move the PB-Registration-HP folder into
your home folder (Go menu, then Home), then run setup again from there."
fi

# Files from a downloaded zip are marked as "from the internet", which stops the
# .command files from opening with a double-click. Clear that, and make the scripts runnable.
xattr -dr com.apple.quarantine "$ROOT" 2>/dev/null
chmod +x "$ROOT"/*.command "$ROOT"/scripts/mac/*.sh

echo 'Checking for Node.js...'
if [ "$(node_major)" -lt 21 ]; then
  if command -v brew >/dev/null 2>&1; then
    echo 'Installing Node.js with Homebrew...'
    brew install node || stop_setup 'Homebrew could not install Node.js. See the messages above.'
  else
    echo 'Downloading the Node.js installer...'
    PKG="$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt | grep -oE 'node-v[0-9.]+\.pkg' | head -1)"
    [ -n "$PKG" ] || stop_setup 'Please install the LTS version of Node.js from https://nodejs.org, then run setup again.'
    curl -fsSL -o "/tmp/$PKG" "https://nodejs.org/dist/latest-v22.x/$PKG" || stop_setup 'The download failed. Please install Node.js from https://nodejs.org, then run setup again.'
    open "/tmp/$PKG"
    stop_setup 'the Node.js installer just opened. Click through it (it asks for your Mac password),
then run setup again.'
  fi
  [ "$(node_major)" -ge 21 ] || stop_setup 'Node.js did not install. Please install the LTS version from https://nodejs.org, then run setup again.'
fi

echo 'Installing packages...'
npm install --no-audit --no-fund || stop_setup 'npm install failed. See the messages above.'

echo 'Installing the browser...'
npx playwright install chromium || stop_setup 'The browser install failed. See the messages above.'

echo 'Setting up the nightly job...'
bash "$ROOT/scripts/mac/register-launchd.sh" || stop_setup 'the nightly job could not be set up.'

echo
echo 'Optional: this Mac can wake itself at 11:40 PM every night, in case it has dozed off.'
echo 'This replaces any other repeating wake or power-on schedule set on this Mac.'
read -r -p 'Set that up now? It asks for your Mac password. (y/n) ' answer
if [[ "$answer" =~ ^[Yy] ]]; then
  if sudo pmset repeat wakeorpoweron MTWRFSU 23:40:00; then
    echo 'Done. It wakes at 11:40 PM if the lid is open and it is plugged in.'
  else
    echo 'That did not work, so keep the Mac awake on booking nights.'
  fi
fi

isNew=false
[ -f .env ] || { cp .env.example .env; isNew=true; }

echo
echo 'Setup is done. Next:'
if $isNew; then
  echo ' 1. Fill in your Plan2Play login in the TextEdit window that just opened, then save.'
  echo '    The email settings are optional. INSTRUCTIONS-MAC.html explains them.'
else
  echo ' 1. Your existing .env was left as it is.'
fi
echo ' 2. Double-click settings.command to choose days, times and courts.'
echo ' 3. Double-click dry-run.command to test. It does not book anything.'
echo ' 4. When you are ready to really book, change ALLOW_REAL_BOOKING to true in .env.'
echo ' On booking nights keep this Mac plugged in with the lid open, and stay logged in.'
echo ' INSTRUCTIONS-MAC.html has every step.'
$isNew && open -e .env
exit 0
