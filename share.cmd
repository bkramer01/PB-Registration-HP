@echo off
rem Builds dist\PB-Registration-HP.zip to send to a friend, without your passwords. Double-click this file.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\make-share-zip.ps1"
pause
