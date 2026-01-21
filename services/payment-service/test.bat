@echo off
REM ============================================
REM Payment Service - Test Script
REM ============================================

echo.
echo ========================================
echo  Payment Service - API Tests
echo ========================================
echo.

set BASE_URL=http://localhost:3003

echo [1] Testing Health Check...
curl -s %BASE_URL%/health
echo.
echo.

echo [2] Creating Payment with ZaloPay...
set IDEMPOTENCY_KEY=test-%RANDOM%
curl -X POST %BASE_URL%/payments ^
  -H "Content-Type: application/json" ^
  -H "Idempotency-Key: %IDEMPOTENCY_KEY%" ^
  -d "{\"rideId\":\"ride-%RANDOM%\",\"userId\":\"user-test\",\"amount\":100000,\"currency\":\"VND\",\"method\":\"card\",\"provider\":\"zalopay\"}"
echo.
echo.

echo [3] Testing Idempotency (same key)...
curl -X POST %BASE_URL%/payments ^
  -H "Content-Type: application/json" ^
  -H "Idempotency-Key: %IDEMPOTENCY_KEY%" ^
  -d "{\"rideId\":\"ride-999\",\"userId\":\"user-test\",\"amount\":100000,\"currency\":\"VND\",\"method\":\"card\",\"provider\":\"zalopay\"}"
echo.
echo.

echo [4] Checking Metrics...
curl -s %BASE_URL%/metrics | findstr payment_
echo.
echo.

echo ========================================
echo  Tests Completed!
echo ========================================
echo.
pause
