#!/bin/bash

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║     AI Retail Copilot - One-Click Start   ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "  [ERROR] Node.js is not installed!"
    echo "  Please download and install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VER=$(node -v)
echo "  [OK] Node.js $NODE_VER detected"

# Install dependencies if needed
if [ ! -d "backend/node_modules" ]; then
    echo ""
    echo "  [1/5] Installing backend dependencies..."
    (cd backend && npm install) || { echo "  [ERROR] Backend npm install failed!"; exit 1; }
else
    echo "  [1/5] Backend dependencies OK"
fi

if [ ! -d "frontend/node_modules" ]; then
    echo ""
    echo "  [2/5] Installing frontend dependencies..."
    (cd frontend && npm install) || { echo "  [ERROR] Frontend npm install failed!"; exit 1; }
else
    echo "  [2/5] Frontend dependencies OK"
fi

# Generate Prisma client (always run to ensure it's up to date)
echo ""
echo "  [3/5] Generating Prisma client..."
(cd backend && npx prisma generate) || { echo "  [ERROR] Prisma generate failed!"; exit 1; }

# Create .env from template if not exists
if [ ! -f "backend/.env" ]; then
    echo ""
    echo "  [4/5] Creating .env from template..."
    cp backend/.env.example backend/.env
    echo "  Created backend/.env — Please edit it to set your LLM API key before using AI features."
else
    echo "  [4/5] .env OK"
fi

# Initialize database if not exists
if [ ! -f "backend/prisma/dev.db" ]; then
    echo ""
    echo "  [5/5] Initializing database with test data..."
    (cd backend && npx prisma migrate deploy) || { echo "  [ERROR] Database migration failed!"; exit 1; }
    (cd backend && npm run seed) || { echo "  [ERROR] Seed data import failed!"; exit 1; }
    echo "  Database ready with test data!"
else
    echo "  [5/5] Database OK"
fi

echo ""
echo "  ────────────────────────────────────────────"
echo "  Starting servers..."
echo "  Backend:  http://localhost:3000"
echo "  Frontend: http://localhost:5173"
echo "  ────────────────────────────────────────────"
echo ""
echo "  Default login: admin / admin"
echo "  Press Ctrl+C to stop all servers."
echo ""

# Start backend in background
(cd backend && node src/index.js) &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend in foreground
(cd frontend && npx vite --open)

# When frontend exits, kill backend
kill $BACKEND_PID 2>/dev/null
