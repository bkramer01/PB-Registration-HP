#!/bin/bash
# Builds two zips to send to a friend, in dist/:
#   PB-Registration-HP-Mac.zip  for a Mac (the Windows files are left out)
#   PB-Registration-HP.zip      for a Windows PC (the Mac files are left out)
# They hold only files tracked by git, which leaves out .env (your passwords), logs,
# screenshots and installed packages. config.json comes from git too, so your friend
# gets the defaults, not your own settings.
source "$(dirname "$0")/common.sh"
cd "$ROOT" || exit 1

command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1 \
  || { echo 'This needs git, to know which files are safe to share.'; exit 1; }
if git ls-files | grep -qE '(^|/)\.env$'; then echo 'Stopped: .env is tracked by git, so it would be shared.'; exit 1; fi

MAC_ONLY='(\.command$|^scripts/mac/|^INSTRUCTIONS-MAC\.html$)'
WINDOWS_ONLY='(\.cmd$|\.ps1$|^INSTRUCTIONS\.html$)'

# $1 is the zip name, $2 a pattern for the files to leave out.
make_zip() {
  local stage dest
  stage="$(mktemp -d)"
  dest="$stage/PB-Registration-HP"
  mkdir -p "$dest"
  git ls-files | grep -v '^\.github/' | grep -vE "$2" | while IFS= read -r file; do
    mkdir -p "$dest/$(dirname "$file")"
    cp -p "$file" "$dest/$file"
  done
  git show HEAD:config.json > "$dest/config.json"
  rm -f "dist/$1"
  (cd "$stage" && zip -qr "$ROOT/dist/$1" PB-Registration-HP)
  rm -rf "$stage"
  echo "Made $ROOT/dist/$1"
}

mkdir -p dist
make_zip PB-Registration-HP-Mac.zip "$WINDOWS_ONLY"
make_zip PB-Registration-HP.zip "$MAC_ONLY"

echo
echo 'For a friend with a Mac, send PB-Registration-HP-Mac.zip. They unzip it and open INSTRUCTIONS-MAC.html.'
echo 'For a friend with a Windows PC, send PB-Registration-HP.zip. They unzip it and open INSTRUCTIONS.html.'
