# Shared by the Mac scripts. Sourced, not run.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LABEL='com.pickleball.booker'
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

# launchd starts jobs with a bare PATH, so look where the Node.js installer and Homebrew put node.
export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin"

node_major() {
  command -v node >/dev/null 2>&1 || { echo 0; return; }
  node --version | sed -E 's/^v([0-9]+).*/\1/'
}

# macOS keeps nightly jobs out of Documents, Desktop, Downloads and iCloud Drive
# unless they're given Full Disk Access, so the folder has to live somewhere else.
in_protected_folder() {
  case "$ROOT/" in
    "$HOME/Documents/"*|"$HOME/Desktop/"*|"$HOME/Downloads/"*|"$HOME/Library/Mobile Documents/"*) return 0 ;;
  esac
  return 1
}
