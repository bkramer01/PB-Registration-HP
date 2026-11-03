@echo off
rem Opens the settings page. Double-click this file.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js isn't installed yet. Run setup.cmd first. & pause & exit /b 1)
node scripts\settings-server.mjs
pause
