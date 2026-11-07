#!/bin/bash
# Creates (or replaces) the nightly job for the logged-in user. No admin rights needed.
# It runs at 11:45 PM every night; on nights with nothing to book the script exits straight
# away, so changing the days in config.json needs no change here.
#
# It's a LaunchAgent, so it only runs while you're logged in: the browser has to be visible.
source "$(dirname "$0")/common.sh"

xml_escape() { sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' <<<"$1"; }
NODE_DIR="$(dirname "$(command -v node)")"

mkdir -p "$(dirname "$PLIST")"
cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$(xml_escape "$ROOT/scripts/mac/run-booker.sh")</string>
  </array>
  <key>WorkingDirectory</key><string>$(xml_escape "$ROOT")</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$(xml_escape "$NODE_DIR"):/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>23</integer>
    <key>Minute</key><integer>45</integer>
  </dict>
  <key>ProcessType</key><string>Interactive</string>
</dict>
</plist>
PLIST_EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null
launchctl bootstrap "gui/$(id -u)" "$PLIST" || { echo 'Could not set up the nightly job.'; exit 1; }
echo 'The nightly job is set up. It runs at 11:45 PM every night.'
