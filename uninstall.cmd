@echo off
rem Removes the nightly task. Your files and settings stay, so delete this folder too if you want them gone.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Unregister-ScheduledTask -TaskName 'Pickleball Booker' -Confirm:$false -ErrorAction SilentlyContinue; if (Get-ScheduledTask -TaskName 'Pickleball Booker' -ErrorAction SilentlyContinue) { 'Could not remove the task.' } else { 'The nightly task is gone. It will not book anything now.' }"
pause
