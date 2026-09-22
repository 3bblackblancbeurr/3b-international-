@echo off
setlocal
cd /d "%~dp0"
title 3B International - Hub 3B V4

echo.
echo ==========================================
echo       3B INTERNATIONAL - HUB 3B V4
echo ==========================================
echo.
echo Lancement automatique du vrai Hub 3B V4 + 8 portails...
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
