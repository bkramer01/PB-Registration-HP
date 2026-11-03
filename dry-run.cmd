@echo off
rem Tries everything except the final booking step. Double-click this file.
cd /d "%~dp0"
call npm run dry-run:local
echo.
echo "dry-run" or "unavailable" or "limit-reached" above means your login and the booking screens work. No court was booked.
pause
