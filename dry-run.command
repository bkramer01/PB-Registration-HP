#!/bin/bash
# Tries everything except the final booking step. Double-click this file.
source "$(dirname "$0")/scripts/mac/common.sh"
cd "$ROOT" || exit 1
npm run dry-run:local
echo
echo '"dry-run" or "unavailable" or "limit-reached" above means your login and the booking screens work. No court was booked.'
read -r -p 'Press Return to close.'
