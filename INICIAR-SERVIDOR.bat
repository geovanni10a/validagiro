@echo off
title ValidaGiro Server
cd /d "%~dp0"
if not exist "node_modules" (
  echo O projeto ainda nao foi preparado. Executando a instalacao...
  call npm install
  if errorlevel 1 pause & exit /b 1
)
call npm run server
echo.
echo O servidor foi encerrado.
pause
