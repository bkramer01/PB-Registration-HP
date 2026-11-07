#!/bin/bash
# Builds dist/PB-Registration-HP.zip to send to a friend. It holds only files tracked by git,
# which leaves out .env (your passwords), logs, screenshots and installed packages.
# config.json comes from git too, so your friend gets the defaults, not your own settings.
source "$(dirname "$0")/common.sh"
cd "$ROOT" || exit 1

command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1 \
  || { echo 'This needs git, to know which files are safe to share.'; exit 1; }
if git ls-files | grep -qE '(^|/)\.env$'; then echo 'Stopped: .env is tracked by git, so it would be shared.'; exit 1; fi

STAGE="$(mktemp -d)"
DEST="$STAGE/PB-Registration-HP"
mkdir -p "$DEST"
git ls-files | grep -v '^\.github/' | while IFS= read -r file; do
  mkdir -p "$DEST/$(dirname "$file")"
  cp -p "$file" "$DEST/$file"
done
git show HEAD:config.json > "$DEST/config.json"
chmod +x "$DEST"/*.command "$DEST"/scripts/mac/*.sh

mkdir -p dist
rm -f dist/PB-Registration-HP.zip
(cd "$STAGE" && zip -qr "$ROOT/dist/PB-Registration-HP.zip" PB-Registration-HP)
rm -rf "$STAGE"

echo "Made $ROOT/dist/PB-Registration-HP.zip"
echo 'Send that file to your friend. On a Mac they follow INSTRUCTIONS-MAC.html, on Windows INSTRUCTIONS.html.'
