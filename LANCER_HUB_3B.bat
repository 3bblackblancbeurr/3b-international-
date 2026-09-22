@echo off
setlocal
cd /d "%~dp0"
title 3B International - Lancement Hub 3B

echo.
echo ==========================================
echo       3B INTERNATIONAL - HUB 3B
echo ==========================================
echo.
echo Lancement automatique du Hub 3B...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\Launch-Hub3B.ps1"

if errorlevel 1 (
  echo.
  echo Une erreur a ete detectee.
  echo Laisse cette fenetre ouverte et prends une photo du message.
  echo.
  pause
)

endlocal
