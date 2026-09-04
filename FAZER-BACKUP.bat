@echo off
title Backup ValidaGiro
cd /d "%~dp0"
if not exist "backups" mkdir "backups"
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set VG_DATE=%%d-%%b-%%c
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set VG_TIME=%%a-%%b
if not exist "server\data\store.json" (
  echo Nenhum banco sincronizado foi encontrado.
  pause
  exit /b 1
)
copy /y "server\data\store.json" "backups\validagiro-%VG_DATE%-%VG_TIME%.json" >nul
echo Backup criado na pasta backups.
pause
