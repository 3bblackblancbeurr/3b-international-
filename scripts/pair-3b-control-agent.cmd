@echo off
title Appairage 3B Control Agent
cd /d "%~dp0\.."
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js est requis pour l'agent 3B.
  echo Installe Node.js LTS puis relance ce fichier.
  pause
  exit /b 1
)
echo.
echo === CENTRE DE COMMANDE 3B ===
set /p CODE=Entre le code temporaire affiche sur ton telephone : 
set /p NAME=Nom de ce PC (laisse vide pour le nom Windows) : 
if "%NAME%"=="" (
  node scripts\threeb-control-agent.mjs pair "%CODE%"
) else (
  node scripts\threeb-control-agent.mjs pair "%CODE%" "%NAME%"
)
echo.
echo Si l'appairage est reussi, lance ensuite start-3b-control-agent.cmd.
pause
