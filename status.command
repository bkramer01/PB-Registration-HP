#!/bin/bash
# Shows whether the nightly job is set up and how its recent runs went. Double-click this file.
source "$(dirname "$0")/scripts/mac/common.sh"
cd "$ROOT" || exit 1
if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
  echo 'The nightly job is set up. It runs at 11:45 PM every night.'
else
  echo 'The nightly job is NOT set up. Run setup.command.'
fi
pmset -g sched 2>/dev/null | grep -qi 'wakeorpoweron' && echo 'This Mac is set to wake at 11:40 PM.'
echo
if [ -f logs/booker.log ]; then
  echo 'Last 5 nightly runs (each should say 23:45):'
  grep '^====' logs/booker.log | tail -5
  echo
  echo 'Latest run:'
  awk '/^====/{buf=""} {buf=buf $0 "\n"} END{printf "%s", buf}' logs/booker.log
else
  echo 'No runs yet. The first one is tonight at 11:45 PM.'
fi
echo
read -r -p 'Press Return to close.'
