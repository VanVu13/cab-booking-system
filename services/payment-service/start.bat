@echo off
REM ============================================
REM Payment Service - Quick Start Script
REM ============================================

echo.
echo ========================================
echo  Payment Service - Quick Start
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] Please run this script from services/payment-service directory
    pause
    exit /b 1
)

echo [1/5] Checking Docker services...
docker ps | findstr payment-db >nul
if errorlevel 1 (
    echo [WARNING] payment-db is not running!
    echo Please start it with: docker-compose up -d payment-db
    pause
    exit /b 1
)
echo [OK] payment-db is running

docker ps | findstr kafka >nul
if errorlevel 1 (
    echo [WARNING] Kafka is not running!
    echo Please add Kafka to docker-compose.yml and run: docker-compose up -d kafka zookeeper
    echo See SETUP_GUIDE.md for details
    pause
    exit /b 1
)
echo [OK] Kafka is running

echo.
echo [2/5] Installing dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
)
echo [OK] Dependencies installed

echo.
echo [3/5] Running database migrations...
call npm run migrate
if errorlevel 1 (
    echo [ERROR] Migration failed
    pause
    exit /b 1
)
echo [OK] Migrations completed

echo.
echo [4/5] Starting API server...
echo.
echo ========================================
echo  Payment Service is starting...
echo  - API Server: http://localhost:3003
echo  - Health: http://localhost:3003/health
echo  - Metrics: http://localhost:3003/metrics
echo ========================================
echo.
echo [INFO] To start Outbox Worker, open another terminal and run:
echo        npm run dev:worker
echo.
echo [INFO] Press Ctrl+C to stop the server
echo.

call npm run dev
