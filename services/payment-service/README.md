# Payment Service

Microservice for handling payments in the cab booking system.

## Features

- **Payment Providers**: Stripe and ZaloPay integrations
- **Transactional Outbox Pattern**: Ensures reliable event publishing
- **Idempotency**: Prevents duplicate payment processing
- **Retry Logic**: Exponential backoff with jitter (1s, 2s, 4s)
- **Webhook Processing**: Secure webhook handling with signature verification
- **Metrics**: Prometheus metrics for monitoring

## Tech Stack

- Node.js + Express + TypeScript
- PostgreSQL (via Knex)
- Kafka (via KafkaJS)
- Stripe SDK
- Pino (logging)
- Prometheus (metrics)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`

3. Run database migrations:
```bash
npm run migrate
```

4. Start the service:
```bash
npm run dev
```

5. Start the outbox worker (in separate terminal):
```bash
npm run dev:worker
```

## API Endpoints

- `POST /payments` - Create payment (requires Idempotency-Key header)
- `GET /payments/:paymentId` - Get payment details
- `GET /payments/by-ride/:rideId` - Get payment by ride ID
- `POST /payments/:paymentId/confirm` - Confirm payment
- `POST /payments/:paymentId/retry` - Retry failed payment
- `POST /payments/:paymentId/refund` - Refund payment (admin only)
- `POST /webhooks/stripe` - Stripe webhook handler
- `POST /webhooks/zalopay` - ZaloPay webhook handler
- `GET /metrics` - Prometheus metrics
- `GET /health` - Health check

## Events Published

- `payment.completed` - Payment succeeded
- `payment.failed` - Payment failed
- `payment.refunded` - Payment refunded

## Database Schema

- `payments` - Payment records
- `payment_attempts` - Provider call attempts
- `webhook_events` - Webhook event log
- `outbox_events` - Transactional outbox
