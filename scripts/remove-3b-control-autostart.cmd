@echo off
title 3B Control Agent - Desactiver le demarrage automatique
cd /d "%~dp0\.."
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js est requis.
  pause
  exit /b 1
)
node scripts\threeb-control-autostart.mjs remove
echo.
pause
