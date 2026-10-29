@echo off
rem DESK uninstall - restores desktop icons and Lively settings
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\uninstall.ps1"
pause
