@echo off
chcp 65001 >nul 2>&1
title AI Retail Copilot

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     AI Retail Copilot - One-Click Start   ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed!
    echo  Please download and install Node.js 18+ from https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo  [OK] Node.js %NODE_VER% detected

:: Step 1: Install dependencies
if not exist "backend\node_modules" (
    echo.
    echo  [1/5] Installing backend dependencies...
    cd backend && npm install && cd ..
    if %errorlevel% neq 0 (
        echo  [ERROR] Backend npm install failed!
        pause
        exit /b 1
    )
) else (
    echo  [1/5] Backend dependencies OK
)

if not exist "frontend\node_modules" (
    echo.
    echo  [2/5] Installing frontend dependencies...
    cd frontend && npm install && cd ..
    if %errorlevel% neq 0 (
        echo  [ERROR] Frontend npm install failed!
        pause
        exit /b 1
    )
) else (
    echo  [2/5] Frontend dependencies OK
)

:: Step 3: Generate Prisma client (always run to ensure it's up to date)
echo.
echo  [3/5] Generating Prisma client...
cd backend && call npx prisma generate && cd ..
if %errorlevel% neq 0 (
    echo  [ERROR] Prisma generate failed!
    pause
    exit /b 1
)

:: Step 4: Create .env from template if not exists
if not exist "backend\.env" (
    echo.
    echo  [4/5] Creating .env from template...
    copy "backend\.env.example" "backend\.env" >nul
    echo  Created backend\.env — Please edit it to set your LLM API key before using AI features.
) else (
    echo  [4/5] .env OK
)

:: Step 5: Initialize database if not exists
if not exist "backend\prisma\dev.db" (
    echo.
    echo  [5/5] Initializing database with test data...
    cd backend
    call npx prisma migrate deploy
    if %errorlevel% neq 0 (
        echo  [ERROR] Database migration failed!
        cd ..
        pause
        exit /b 1
    )
    call npm run seed
    if %errorlevel% neq 0 (
        echo  [ERROR] Seed data import failed!
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo  Database ready with test data!
) else (
    echo  [5/5] Database OK
)

echo.
echo  ────────────────────────────────────────────
echo  Starting servers...
echo  Backend:  http://localhost:3000
echo  Frontend: http://localhost:5173
echo  ────────────────────────────────────────────
echo.
echo  Default login: admin / admin
echo  Press Ctrl+C to stop all servers.
echo.

:: Start backend in background
start /b "Backend" cmd /c "cd backend && node src/index.js"

:: Wait a moment for backend to start
timeout /t 2 /nobreak >nul

:: Start frontend (foreground - this window)
cd frontend && npx vite --open

:: When frontend exits, kill backend
taskkill /fi "WINDOWTITLE eq Backend" >nul 2>&1
