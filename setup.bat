@echo off
REM Double-click this on Windows to run the setup wizard.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required but not installed.
  echo Download it from https://nodejs.org ^(LTS version^).
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies ^(first run, this takes a minute^)...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

node scripts\setup.mjs
echo.
pause
