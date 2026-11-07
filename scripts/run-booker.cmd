@echo off
rem Started by Windows Task Scheduler each night. Output goes to logs\booker.log.
cd /d "%~dp0.."
if not exist logs mkdir logs
echo ==== %date% %time% >> logs\booker.log
node --env-file=.env src\book.js --scheduled --headed >> logs\booker.log 2>&1
