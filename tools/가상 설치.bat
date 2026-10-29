@echo off
rem Virtual install test: builds a fake PC in %TEMP%\adesk-dry, installs, checks, then uninstalls. Touches nothing real.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\setup\install.ps1" -DryRun %*
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\setup\uninstall.ps1" -DryRun
pause
