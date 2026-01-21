# Payment Service - Hướng Dẫn Chạy Chi Tiết

## 📋 Tổng Quan

Payment Service là microservice xử lý thanh toán với các tính năng:
- ✅ Transactional Outbox Pattern
- ✅ Idempotency (tránh duplicate)
- ✅ Retry với Exponential Backoff (1s-2s-4s + jitter)
- ✅ Stripe + ZaloPay integration
- ✅ Webhook processing
- ✅ Kafka event publishing
- ✅ Prometheus metrics

## 🔧 Yêu Cầu Hệ Thống

- Node.js >= 18
- PostgreSQL (đã có trong docker-compose)
- Kafka + Zookeeper (cần thêm vào docker-compose)

## 📦 Bước 1: Cài Đặt Infrastructure

### 1.1. Thêm Kafka vào Root docker-compose.yml

Mở file `docker-compose.yml` ở root project và thêm:

```yaml
services:
  payment-db:
    # ... đã có sẵn
  
  # THÊM MỚI:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"
    networks:
      - payment-network

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    networks:
      - payment-network

networks:
  payment-network:
    driver: bridge

volumes:
  payment_db_data:
```

### 1.2. Start Infrastructure

```bash
# Từ root project
cd d:\DemoBIGDATA\cab-booking-system

# Start tất cả services
docker-compose up -d

# Kiểm tra services đang chạy
docker-compose ps
```

Bạn sẽ thấy:
- ✅ payment-db (PostgreSQL) - port 5436
- ✅ zookeeper - port 2181
- ✅ kafka - port 9092

## 📦 Bước 2: Cài Đặt Payment Service

```bash
# Di chuyển vào thư mục payment service
cd services\payment-service

# Cài đặt dependencies
npm install
```

## 🗄️ Bước 3: Chạy Database Migrations

```bash
# Vẫn ở trong services/payment-service
npm run migrate
```

Kết quả thành công sẽ hiển thị:
```
Batch 1 run: 4 migrations
✔ 20260120000001_create_payments.ts
✔ 20260120000002_create_payment_attempts.ts
✔ 20260120000003_create_webhook_events.ts
✔ 20260120000004_create_outbox_events.ts
```

### Kiểm Tra Database (Optional)

```bash
# Connect vào PostgreSQL
docker exec -it payment-db psql -U payment_user -d payment_db

# Xem các bảng
\dt

# Thoát
\q
```

## 🚀 Bước 4: Chạy Payment Service

### 4.1. Chạy API Server

Mở **Terminal 1**:

```bash
cd d:\DemoBIGDATA\cab-booking-system\services\payment-service
npm run dev
```

Kết quả thành công:
```
[INFO] Payment service started {"port":3003}
```

### 4.2. Chạy Outbox Worker

Mở **Terminal 2** (terminal mới):

```bash
cd d:\DemoBIGDATA\cab-booking-system\services\payment-service
npm run dev:worker
```

Kết quả thành công:
```
[INFO] Starting outbox worker process
[INFO] Starting outbox worker {"pollInterval":1000}
[INFO] Kafka producer connected
```

## ✅ Bước 5: Test Payment Service

### 5.1. Health Check

```bash
curl http://localhost:3003/health
```

Response:
```json
{
  "status": "healthy",
  "service": "payment-service"
}
```

### 5.2. Tạo Payment (ZaloPay - Stub)

```bash
curl -X POST http://localhost:3003/payments ^
  -H "Content-Type: application/json" ^
  -H "Idempotency-Key: test-key-001" ^
  -d "{\"rideId\":\"ride-123\",\"userId\":\"user-456\",\"amount\":100000,\"currency\":\"VND\",\"method\":\"card\",\"provider\":\"zalopay\"}"
```

Response thành công:
```json
{
  "paymentId": "uuid-here",
  "status": "PENDING",
  "providerPaymentId": "ZP1737389288123",
  "requiresAction": false
}
```

### 5.3. Get Payment Details

```bash
# Thay {paymentId} bằng ID từ response trên
curl http://localhost:3003/payments/{paymentId}
```

### 5.4. Get Payment by Ride ID

```bash
curl http://localhost:3003/payments/by-ride/ride-123
```

### 5.5. Test Idempotency

Chạy lại request tạo payment với cùng `Idempotency-Key`:

```bash
curl -X POST http://localhost:3003/payments ^
  -H "Content-Type: application/json" ^
  -H "Idempotency-Key: test-key-001" ^
  -d "{\"rideId\":\"ride-123\",\"userId\":\"user-456\",\"amount\":100000,\"currency\":\"VND\",\"method\":\"card\",\"provider\":\"zalopay\"}"
```

Sẽ trả về **cùng response** như lần đầu (không tạo payment mới).

### 5.6. Test Refund (Admin Only)

```bash
curl -X POST http://localhost:3003/payments/{paymentId}/refund ^
  -H "Content-Type: application/json" ^
  -H "x-role: admin" ^
  -d "{\"reason\":\"Customer request\"}"
```

### 5.7. Check Prometheus Metrics

```bash
curl http://localhost:3003/metrics
```

Sẽ thấy các metrics:
```
# HELP payment_success_total Total number of successful payments
# TYPE payment_success_total counter
payment_success_total{provider="zalopay",method="card"} 1

# HELP payment_provider_latency_ms Payment provider API call latency
# TYPE payment_provider_latency_ms histogram
payment_provider_latency_ms_bucket{le="100",provider="zalopay",operation="create"} 1
...
```

## 🔍 Bước 6: Kiểm Tra Outbox Worker

### 6.1. Xem Logs của Outbox Worker

Trong Terminal 2 (outbox worker), bạn sẽ thấy:

```
[INFO] Processing outbox events {"count":1}
[INFO] Outbox event published to Kafka {"eventId":"uuid","type":"payment.completed"}
[INFO] Outbox event published {"eventId":"uuid","type":"payment.completed"}
```

### 6.2. Kiểm Tra Database

```bash
# Connect vào DB
docker exec -it payment-db psql -U payment_user -d payment_db

# Xem outbox events
SELECT id, type, status, published_at FROM outbox_events ORDER BY created_at DESC LIMIT 5;

# Kết quả mong đợi:
#  id   |        type         |  status   |      published_at
# ------+--------------------+-----------+------------------------
#  uuid | payment.completed  | PUBLISHED | 2026-01-20 22:40:00
```

### 6.3. Kiểm Tra Kafka Topics (Optional)

```bash
# Vào container Kafka
docker exec -it kafka bash

# List topics
kafka-topics --bootstrap-server localhost:9092 --list

# Consume messages từ topic payment.completed
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic payment.completed \
  --from-beginning
```

## 📊 Cấu Trúc File Quan Trọng

```
services/payment-service/
├── .env                          # Cấu hình môi trường
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript config
├── knexfile.js                   # Knex CLI config
├── migrations/                   # Database migrations
│   ├── 20260120000001_create_payments.ts
│   ├── 20260120000002_create_payment_attempts.ts
│   ├── 20260120000003_create_webhook_events.ts
│   └── 20260120000004_create_outbox_events.ts
└── src/
    ├── index.ts                  # Main API server
    ├── app.ts                    # Express app setup
    ├── domain/types.ts           # Domain models
    ├── repositories/             # Data access layer
    ├── services/                 # Business logic
    │   ├── payment.service.ts    # Core payment logic
    │   ├── webhook.service.ts    # Webhook processing
    │   └── retry.service.ts      # Retry logic
    ├── providers/                # Payment providers
    │   ├── stripe.adapter.ts     # Stripe integration
    │   └── zalopay.adapter.ts    # ZaloPay stub
    ├── api/                      # API layer
    │   ├── controllers/
    │   └── routes/
    ├── middleware/               # Express middleware
    ├── kafka/                    # Kafka integration
    ├── workers/                  # Background workers
    │   └── outbox.worker.ts      # Outbox pattern worker
    └── utils/                    # Utilities
        ├── logger.ts             # Pino logger
        ├── metrics.ts            # Prometheus metrics
        └── db.ts                 # Database connection
```

## 🔑 Environment Variables

File `.env` quan trọng:

```env
# Service
PORT=3003
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5436
DB_NAME=payment_db
DB_USER=payment_user
DB_PASSWORD=payment_pass

# Kafka
KAFKA_BROKER=localhost:9092

# Stripe (cần API key thật để test Stripe)
STRIPE_API_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# ZaloPay (stub - không cần thay đổi)
ZALOPAY_APP_ID=2553
ZALOPAY_KEY=stub_key_12345

# Retry Config
MAX_RETRY_ATTEMPTS=3
RETRY_BASE_DELAY_MS=1000

# Outbox Worker
OUTBOX_POLL_INTERVAL_MS=1000
OUTBOX_BATCH_SIZE=10
```

## 🎯 Các API Endpoints

| Method | Endpoint | Headers | Body | Mô tả |
|--------|----------|---------|------|-------|
| POST | `/payments` | `Idempotency-Key` | CreatePaymentRequest | Tạo payment mới |
| GET | `/payments/:paymentId` | - | - | Lấy thông tin payment |
| GET | `/payments/by-ride/:rideId` | - | - | Lấy payment theo ride |
| POST | `/payments/:paymentId/confirm` | - | ConfirmPaymentRequest | Confirm payment (3DS) |
| POST | `/payments/:paymentId/retry` | - | - | Retry payment thất bại |
| POST | `/payments/:paymentId/refund` | `x-role: admin` | RefundPaymentRequest | Hoàn tiền |
| POST | `/webhooks/stripe` | `stripe-signature` | Raw body | Stripe webhook |
| POST | `/webhooks/zalopay` | `x-zalopay-signature` | JSON | ZaloPay webhook |
| GET | `/metrics` | - | - | Prometheus metrics |
| GET | `/health` | - | - | Health check |

## 🐛 Troubleshooting

### Lỗi: Cannot connect to database

```bash
# Kiểm tra PostgreSQL đang chạy
docker ps | findstr payment-db

# Restart PostgreSQL
docker-compose restart payment-db
```

### Lỗi: Kafka connection failed

```bash
# Kiểm tra Kafka đang chạy
docker ps | findstr kafka

# Restart Kafka
docker-compose restart kafka zookeeper
```

### Lỗi: Migration failed

```bash
# Rollback migration
npm run migrate:rollback

# Chạy lại
npm run migrate
```

### Xem logs chi tiết

```bash
# API server logs
npm run dev

# Outbox worker logs
npm run dev:worker
```

## 📝 Test Flow Hoàn Chỉnh

```bash
# 1. Tạo payment
curl -X POST http://localhost:3003/payments ^
  -H "Content-Type: application/json" ^
  -H "Idempotency-Key: test-$(date +%s)" ^
  -d "{\"rideId\":\"ride-999\",\"userId\":\"user-999\",\"amount\":50000,\"currency\":\"VND\",\"method\":\"card\",\"provider\":\"zalopay\"}"

# Lưu paymentId từ response

# 2. Get payment details
curl http://localhost:3003/payments/{paymentId}

# 3. Get by ride
curl http://localhost:3003/payments/by-ride/ride-999

# 4. Refund (nếu payment succeeded)
curl -X POST http://localhost:3003/payments/{paymentId}/refund ^
  -H "Content-Type: application/json" ^
  -H "x-role: admin" ^
  -d "{\"reason\":\"Test refund\"}"

# 5. Check metrics
curl http://localhost:3003/metrics
```

## 🎉 Kết Luận

Payment Service đã sẵn sàng với:
- ✅ Database migrations hoàn tất
- ✅ API server chạy trên port 3003
- ✅ Outbox worker publish events lên Kafka
- ✅ Idempotency đảm bảo không duplicate
- ✅ Retry logic với exponential backoff
- ✅ Metrics tracking với Prometheus

**Chạy production:**
```bash
npm run build
npm start              # API server
npm run start:worker   # Outbox worker
```
