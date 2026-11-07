#!/bin/bash
# Started by launchd each night (see register-launchd.sh). Output goes to logs/booker.log.
source "$(dirname "$0")/common.sh"
cd "$ROOT" || exit 1
mkdir -p logs
echo "==== $(date '+%a %m/%d/%Y %H:%M:%S')" >> logs/booker.log
# caffeinate keeps the Mac from sleeping until the run is over.
caffeinate -is node --env-file=.env src/book.js --scheduled --headed >> logs/booker.log 2>&1
