#!/bin/bash
# Removes the nightly job. Your files and settings stay, so delete this folder too if you want them gone.
source "$(dirname "$0")/scripts/mac/common.sh"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null
rm -f "$PLIST"
if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
  echo 'Could not remove the nightly job.'
else
  echo 'The nightly job is gone. It will not book anything now.'
fi
if pmset -g sched 2>/dev/null | grep -qi 'wakeorpoweron'; then
  read -r -p 'Also stop this Mac waking at 11:40 PM? It asks for your Mac password. (y/n) ' answer
  [[ "$answer" =~ ^[Yy] ]] && sudo pmset repeat cancel && echo 'The nightly wake is off.'
fi
read -r -p 'Press Return to close.'
