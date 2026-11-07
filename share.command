#!/bin/bash
# Builds dist/PB-Registration-HP.zip to send to a friend, without your passwords. Double-click this file.
bash "$(dirname "$0")/scripts/mac/make-share-zip.sh"
read -r -p 'Press Return to close.'
