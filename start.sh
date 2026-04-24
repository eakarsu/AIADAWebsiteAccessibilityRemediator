#!/bin/bash

# ============================================================
# AI ADA Website Accessibility Remediator - Start Script
# ============================================================
# This script:
# 1. Cleans used ports (3000, 3001)
# 2. Creates PostgreSQL database if needed
# 3. Seeds the database with sample data
# 4. Starts backend with hot reload (nodemon)
# 5. Starts frontend with hot reload (Vite)
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
DB_NAME=${DB_NAME:-aiada_accessibility}
DB_USER=${DB_USER:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo "============================================================"
echo "  AI ADA Website Accessibility Remediator"
echo "============================================================"
echo ""

# ---- Step 1: Clean used ports ----
echo "[1/5] Cleaning used ports ($FRONTEND_PORT, $BACKEND_PORT)..."

cleanup_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  Killing processes on port $port: $pids"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    echo "  Port $port is free"
  fi
}

cleanup_port $FRONTEND_PORT
cleanup_port $BACKEND_PORT

# ---- Step 2: Install dependencies ----
echo ""
echo "[2/5] Installing dependencies..."

if [ ! -d "server/node_modules" ]; then
  echo "  Installing server dependencies..."
  cd server && npm install && cd ..
else
  echo "  Server dependencies already installed"
fi

if [ ! -d "client/node_modules" ]; then
  echo "  Installing client dependencies..."
  cd client && npm install && cd ..
else
  echo "  Client dependencies already installed"
fi

# ---- Step 3: Setup PostgreSQL database ----
echo ""
echo "[3/5] Setting up PostgreSQL database..."

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
  echo "  Starting PostgreSQL..."
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || {
    echo "  ERROR: Could not start PostgreSQL. Please start it manually."
    exit 1
  }
  sleep 2
fi

# Create database if it doesn't exist
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo "  Creating database '$DB_NAME'..."
  createdb -h $DB_HOST -p $DB_PORT -U $DB_USER "$DB_NAME" 2>/dev/null || \
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || {
      echo "  WARNING: Could not create database. It may already exist or you may need to create it manually."
    }
else
  echo "  Database '$DB_NAME' already exists"
fi

# ---- Step 4: Seed the database ----
echo ""
echo "[4/5] Seeding database with sample data..."
cd server
node seed.js
cd ..

# ---- Step 5: Start services with hot reload ----
echo ""
echo "[5/5] Starting services with hot reload..."
echo ""
echo "============================================================"
echo "  Backend:  http://localhost:$BACKEND_PORT"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo "============================================================"
echo ""
echo "  Login credentials:"
echo "    Email:    admin@ada-remediator.com"
echo "    Password: Admin123!"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "============================================================"
echo ""

# Function to clean up background processes on exit
cleanup() {
  echo ""
  echo "Shutting down services..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  echo "All services stopped."
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend with nodemon for hot reload
cd server
npx nodemon index.js &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to initialize
sleep 2

# Start frontend with Vite (built-in hot reload)
cd client
npx vite --port $FRONTEND_PORT --host &
FRONTEND_PID=$!
cd ..

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
