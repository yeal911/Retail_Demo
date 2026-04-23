@echo off
chcp 65001 >nul 2>&1
title AI Retail Copilot

echo.
echo  ============================================
echo       AI Retail Copilot - One-Click Start
echo  ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% equ 0 goto :node_ok

echo  Node.js is not installed. Attempting to install...
echo.

:: Method 1: Try winget (Windows 10 1809+ / Windows 11)
where winget >nul 2>&1
if %errorlevel% equ 0 (
    echo  Installing Node.js LTS via winget...
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements --silent
    if %errorlevel% equ 0 (
        echo  Node.js installed successfully!
        :: Refresh PATH for current session
        set "PATH=%PATH%;%ProgramFiles%\nodejs"
        goto :node_ok
    )
    echo  winget install failed, trying direct download...
)

:: Method 2: Download and install via PowerShell
echo  Downloading Node.js LTS installer...
powershell -ExecutionPolicy Bypass -Command ^
    "$url = (Invoke-RestRequest 'https://nodejs.org/dist/index.json' | Select-Object -First 1).version; ^
     $ver = $url.TrimStart('v'); ^
     $msi = \"node-v$ver-x64.msi\"; ^
     $dl = \"https://nodejs.org/dist/v$ver/$msi\"; ^
     Write-Host \"  Downloading Node.js v$ver...\"; ^
     Invoke-WebRequest -Uri $dl -OutFile \"$env:TEMP\$msi\" -UseBasicParsing; ^
     Write-Host '  Installing...'; ^
     Start-Process msiexec.exe -ArgumentList '/i',\"$env:TEMP\$msi\",'/qn','/norestart' -Wait -NoNewWindow; ^
     Remove-Item \"$env:TEMP\$msi\" -Force" 2>nul

:: Refresh PATH after install
set "PATH=%PATH%;%ProgramFiles%\nodejs"

:: Verify installation
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Auto-install failed. Please install Node.js manually:
    echo  https://nodejs.org  -  Download LTS version, run installer, then re-run this script.
    echo.
    pause
    exit /b 1
)

:node_ok

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo  [OK] Node.js %NODE_VER% detected

:: Step 1: Install backend dependencies
if not exist "backend\node_modules" (
    echo.
    echo  [1/5] Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    if not exist "backend\node_modules" (
        echo  [ERROR] Backend npm install failed!
        pause
        exit /b 1
    )
) else (
    echo  [1/5] Backend dependencies OK
)

:: Step 2: Install frontend dependencies
if not exist "frontend\node_modules" (
    echo.
    echo  [2/5] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    if not exist "frontend\node_modules" (
        echo  [ERROR] Frontend npm install failed!
        pause
        exit /b 1
    )
) else (
    echo  [2/5] Frontend dependencies OK
)

:: Step 3: Generate Prisma client
echo.
echo  [3/5] Generating Prisma client...
cd backend
call npx prisma generate
cd ..

:: Step 4: Create .env from template if not exists
if not exist "backend\.env" (
    echo.
    echo  [4/5] Creating .env from template...
    copy "backend\.env.example" "backend\.env" >nul
    echo  Created backend\.env - Please edit it to set your LLM API key.
) else (
    echo  [4/5] .env OK
)

:: Step 5: Initialize database if not exists
if not exist "backend\prisma\dev.db" (
    echo.
    echo  [5/5] Initializing database with test data...
    cd backend
    call npx prisma migrate deploy
    call npm run seed
    cd ..
    if not exist "backend\prisma\dev.db" (
        echo  [ERROR] Database initialization failed!
        pause
        exit /b 1
    )
    echo  Database ready with test data!
) else (
    echo  [5/5] Database OK
)

echo.
echo  --------------------------------------------
echo  Starting servers...
echo  Backend:  http://localhost:3000
echo  Frontend: http://localhost:5173
echo  --------------------------------------------
echo.
echo  Default login: admin / admin
echo  Press Ctrl+C to stop all servers.
echo.

:: Start backend in background
start "Backend" /min cmd /c "cd /d "%~dp0backend" && node src/index.js"

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend (foreground)
cd /d "%~dp0frontend"
call npx vite --open

:: When frontend exits, kill backend
taskkill /fi "WINDOWTITLE eq Backend" >nul 2>&1
