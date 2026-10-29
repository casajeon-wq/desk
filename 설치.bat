@echo off
rem DESK install - double click
set "ADESK_SOURCE=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -LiteralPath $env:ADESK_SOURCE -File -Recurse | Unblock-File"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\install.ps1"
pause
