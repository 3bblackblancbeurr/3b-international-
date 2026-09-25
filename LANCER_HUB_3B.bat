@echo off
setlocal
cd /d "%~dp0"
title 3B International - Hub3B Main V05 Premium

echo.
echo ==========================================
echo       3B INTERNATIONAL - HUB3B MAIN V05 PREMIUM
echo ==========================================
echo.
echo Lancement automatique du vrai Hub3B Main V05 Premium + 8 portails...
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
