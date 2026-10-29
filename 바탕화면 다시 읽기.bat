@echo off
rem re-read desktop shortcuts into the wallpaper (after installing new apps)
if not exist "%LOCALAPPDATA%\DeskWallpaper\rescan.ps1" (
  echo Not installed yet. Run the install bat first.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%LOCALAPPDATA%\DeskWallpaper\rescan.ps1"
pause
