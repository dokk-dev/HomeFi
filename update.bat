@echo off
REM Double-click this on Windows to update Meridian:
REM pulls latest, installs deps, applies SQL migrations, rebuilds.
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

if not exist ".env.local" (
  echo .env.local not found - running setup wizard first...
  call node scripts\setup.mjs
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

call node scripts\update.mjs
echo.
pause
