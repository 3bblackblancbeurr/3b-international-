@echo off
title 3B Control Agent
cd /d "%~dp0\.."
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js est requis pour lancer l'agent 3B.
  echo Installe Node.js LTS puis relance ce fichier.
  pause
  exit /b 1
)
node scripts\threeb-control-agent.mjs run
pause
