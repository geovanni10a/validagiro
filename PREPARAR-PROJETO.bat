@echo off
title Preparar ValidaGiro
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao foi encontrado.
  echo Instale a versao LTS em https://nodejs.org/ e execute novamente.
  pause
  exit /b 1
)
echo Instalando os componentes do ValidaGiro...
call npm install
if errorlevel 1 (
  echo.
  echo A instalacao falhou. Confira a internet e tente novamente.
  pause
  exit /b 1
)
echo.
echo Preparacao concluida.
pause
