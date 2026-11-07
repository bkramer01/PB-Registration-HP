#!/bin/bash
# Opens the settings page. Double-click this file.
source "$(dirname "$0")/scripts/mac/common.sh"
cd "$ROOT" || exit 1
command -v node >/dev/null 2>&1 || { echo "Node.js isn't installed yet. Run setup.command first."; read -r -p 'Press Return to close.'; exit 1; }
node scripts/settings-server.mjs
