@echo off
REM Double-click this on Windows to start MyFi.
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

REM Open the browser shortly after the server starts.
start "" /b cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000"

echo.
echo Starting MyFi at http://localhost:3000
echo Press Ctrl+C in this window to stop the server.
echo.
call npm run dev
