# Payment Service - Tổng Hợp Code Quan Trọng

## 🎯 Core Business Logic

### 1. Payment Service - Logic Chính

**File:** `src/services/payment.service.ts`

**Chức năng chính:**
- ✅ Tạo payment với idempotency check
- ✅ Retry với exponential backoff (1s-2s-4s + jitter)
- ✅ Transaction management (atomicity)
- ✅ Tạo outbox event trong cùng transaction

**Flow tạo payment:**
```typescript
async createPayment(request, idempotencyKey) {
  // 1. Check idempotency - tránh duplicate
  const existing = await this.paymentRepo.findByIdempotencyKey(idempotencyKey);
  if (existing) return this.mapToResponse(existing);

  // 2. Start transaction
  const trx = await this.db.transaction();
  
  try {
    // 3. Create payment record (status: INITIATED)
    const payment = await this.paymentRepo.create({...}, trx);
    
    // 4. Call provider với retry (max 3 lần)
    const result = await this.callProviderWithRetry(
      payment.id, 
      request.provider, 
      {...}
    );
    
    // 5. Update payment với kết quả
    const updated = await this.paymentRepo.update(payment.id, {
      provider_payment_id: result.providerPaymentId,
      status: result.status,
      ...
    }, trx);
    
    // 6. Tạo outbox event (nếu succeeded/failed)
    if (result.status === SUCCEEDED || result.status === FAILED) {
      await this.createOutboxEvent(updated, trx);
    }
    
    // 7. Commit transaction
    await trx.commit();
    
    return this.mapToResponse(updated);
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}
```

**Retry Logic:**
```typescript
private async callProviderWithRetry(paymentId, provider, params) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await paymentProvider.createPayment(params);
      
      // Log attempt vào DB
      await this.attemptRepo.create({
        paymentId,
        status: result.success ? SUCCESS : FAILURE,
        latencyMs: latency,
        ...
      });
      
      if (result.success || !shouldRetry(attempt + 1)) {
        return result;
      }
    } catch (error) {
      // Log timeout
      await this.attemptRepo.create({
        paymentId,
        status: TIMEOUT,
        ...
      });
    }
    
    // Exponential backoff: 1s, 2s, 4s (+ jitter)
    if (shouldRetry(attempt + 1)) {
      const delay = calculateDelay(attempt); // 2^n * 1000 + jitter
      await sleep(delay);
    }
  }
  
  // Hết retry -> FAILED
  return { success: false, status: FAILED, ... };
}
```

### 2. Retry Service - Exponential Backoff

**File:** `src/services/retry.service.ts`

```typescript
calculateDelay(attemptNumber: number): number {
  // Exponential: 2^n * baseDelay
  const exponentialDelay = Math.pow(2, attemptNumber) * 1000;
  
  // Jitter: random 0-20% của delay
  const jitter = Math.random() * exponentialDelay * 0.2;
  
  return exponentialDelay + jitter;
}

// Kết quả:
// Attempt 0: 1000ms + (0-200ms) = 1000-1200ms
// Attempt 1: 2000ms + (0-400ms) = 2000-2400ms
// Attempt 2: 4000ms + (0-800ms) = 4000-4800ms
```

### 3. Webhook Service - Idempotent Processing

**File:** `src/services/webhook.service.ts`

```typescript
async processWebhook({ provider, payload, signature }) {
  // 1. Verify signature
  const verification = await providerAdapter.verifyWebhook({
    payload,
    signature
  });
  
  if (!verification.valid) {
    return { processed: false, message: 'Invalid signature' };
  }
  
  const event = verification.event;
  const eventId = event.id;
  
  // 2. Check duplicate (idempotency)
  const existing = await this.webhookRepo.findByProviderAndEventId(
    provider,
    eventId
  );
  
  if (existing) {
    return { processed: true, message: 'Already processed' };
  }
  
  // 3. Store webhook event
  const webhookEvent = await this.webhookRepo.create({
    provider,
    eventId,
    signatureValid: true,
    payload: event
  });
  
  // 4. Process event trong transaction
  const trx = await this.db.transaction();
  try {
    // Update payment status
    const payment = await this.paymentRepo.updateStatus(
      paymentId,
      newStatus,
      undefined,
      trx
    );
    
    // Create outbox event
    await this.outboxRepo.create({
      aggregateType: 'PAYMENT',
      aggregateId: payment.id,
      type: eventType,
      payload: {...}
    }, trx);
    
    await trx.commit();
  } catch (error) {
    await trx.rollback();
    throw error;
  }
  
  // 5. Mark as processed
  await this.webhookRepo.markAsProcessed(webhookEvent.id);
  
  return { processed: true, message: 'Processed successfully' };
}
```

### 4. Outbox Worker - Reliable Event Publishing

**File:** `src/workers/outbox.worker.ts`

```typescript
async start() {
  this.isRunning = true;
  
  // Run ngay lập tức
  await this.processOutboxEvents();
  
  // Sau đó chạy mỗi 1000ms
  this.intervalId = setInterval(async () => {
    await this.processOutboxEvents();
  }, 1000);
}

private async processOutboxEvents() {
  // 1. Fetch pending events (max 10)
  const pendingEvents = await this.outboxRepo.findPending(10);
  
  if (pendingEvents.length === 0) return;
  
  for (const event of pendingEvents) {
    try {
      // 2. Publish to Kafka (event.id làm key -> idempotent)
      await this.eventPublisher.publishOutboxEvent(event);
      
      // 3. Mark as published
      await this.outboxRepo.markAsPublished(event.id);
      
      // 4. Update metrics
      outboxEventsPublishedCounter.inc({ event_type: event.type });
      
    } catch (error) {
      // Mark as failed
      await this.outboxRepo.markAsFailed(event.id);
      outboxEventsFailedCounter.inc();
    }
  }
}
```

## 🔌 Payment Provider Adapters

### Stripe Adapter

**File:** `src/providers/stripe.adapter.ts`

```typescript
async createPayment({ amount, currency, metadata }) {
  try {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      metadata,
      automatic_payment_methods: { enabled: true }
    });
    
    return {
      success: true,
      providerPaymentId: paymentIntent.id,
      status: this.mapStripeStatus(paymentIntent.status),
      clientSecret: paymentIntent.client_secret,
      requiresAction: paymentIntent.status === 'requires_action'
    };
  } catch (error) {
    return {
      success: false,
      providerPaymentId: null,
      status: FAILED,
      failureCode: error.code,
      failureMessage: error.message
    };
  }
}

async verifyWebhook({ payload, signature }) {
  try {
    // Stripe SDK verify signature
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret
    );
    
    return { valid: true, event };
  } catch (error) {
    return { valid: false };
  }
}
```

### ZaloPay Adapter (Stub)

**File:** `src/providers/zalopay.adapter.ts`

```typescript
async createPayment({ amount, currency, metadata }) {
  // Simulate network delay
  await this.delay(100);
  
  // 90% success rate
  const success = Math.random() > 0.1;
  
  if (success) {
    const mockOrderId = `ZP${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    return {
      success: true,
      providerPaymentId: mockOrderId,
      status: PENDING,
      metadata: {
        zpTransToken: `token_${mockOrderId}`,
        orderUrl: `https://zalopay.vn/pay/${mockOrderId}`
      }
    };
  } else {
    return {
      success: false,
      providerPaymentId: null,
      status: FAILED,
      failureCode: 'zalopay_error',
      failureMessage: 'ZaloPay stub simulated failure'
    };
  }
}
```

## 🗄️ Database Schema

### Payments Table

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL,
  method TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'INITIATED',
  failure_code TEXT,
  failure_message TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  attempt_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
```

### Outbox Events Table

```sql
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  published_at TIMESTAMP
);

CREATE INDEX idx_outbox_status_created ON outbox_events(status, created_at);
```

## 🎯 API Controllers

### Payment Controller

**File:** `src/api/controllers/payment.controller.ts`

```typescript
async createPayment(req: Request, res: Response) {
  const correlationId = req.correlationId;
  const idempotencyKey = req.idempotencyKey;
  const request: CreatePaymentRequest = req.body;
  
  const result = await paymentService.createPayment(
    request, 
    idempotencyKey
  );
  
  res.status(201).json(result);
}

async refundPayment(req: Request, res: Response) {
  const { paymentId } = req.params;
  const request: RefundPaymentRequest = req.body;
  
  const payment = await paymentService.refundPayment(
    paymentId, 
    request
  );
  
  res.json(payment);
}
```

### Webhook Controller

**File:** `src/api/controllers/webhook.controller.ts`

```typescript
async handleStripeWebhook(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'];
  
  if (!signature) {
    return res.status(400).json({
      error: 'Missing stripe-signature header'
    });
  }
  
  const result = await webhookService.processWebhook({
    provider: 'stripe',
    payload: req.body, // Raw body
    signature
  });
  
  res.json(result);
}
```

## 🔧 Middleware

### Idempotency Middleware

```typescript
export const idempotencyMiddleware = (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return res.status(400).json({
      error: 'Idempotency-Key header is required'
    });
  }
  
  req.idempotencyKey = idempotencyKey;
  next();
};
```

### Correlation Middleware

```typescript
export const correlationMiddleware = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  
  next();
};
```

## 📊 Prometheus Metrics

**File:** `src/utils/metrics.ts`

```typescript
// Counters
export const paymentSuccessCounter = new Counter({
  name: 'payment_success_total',
  help: 'Total successful payments',
  labelNames: ['provider', 'method']
});

export const paymentFailedCounter = new Counter({
  name: 'payment_failed_total',
  help: 'Total failed payments',
  labelNames: ['provider', 'method', 'failure_code']
});

// Histogram
export const paymentProviderLatencyHistogram = new Histogram({
  name: 'payment_provider_latency_ms',
  help: 'Provider API latency',
  labelNames: ['provider', 'operation'],
  buckets: [50, 100, 200, 500, 1000, 2000, 5000]
});

// Usage:
paymentSuccessCounter.inc({ provider: 'stripe', method: 'card' });
paymentProviderLatencyHistogram.observe(
  { provider: 'stripe', operation: 'create' }, 
  latencyMs
);
```

## 🚀 Các Pattern Được Implement

### 1. Transactional Outbox Pattern
- Payment update + Outbox event creation trong **cùng 1 transaction**
- Worker poll outbox events và publish lên Kafka
- Đảm bảo **exactly-once** semantics

### 2. Idempotency Pattern
- `idempotency_key` unique constraint
- Check existing payment trước khi tạo mới
- Webhook events có unique constraint `(provider, event_id)`

### 3. Retry with Exponential Backoff
- Base delay: 1000ms
- Exponential: 2^n * baseDelay
- Jitter: random 0-20% để tránh thundering herd
- Max attempts: 3

### 4. Repository Pattern
- Tách biệt data access logic
- Support transaction parameter
- Reusable queries

### 5. Adapter Pattern
- `IPaymentProvider` interface
- Stripe + ZaloPay adapters
- Factory pattern để tạo provider

## 📝 Request/Response Examples

### Create Payment Request
```json
{
  "rideId": "ride-123",
  "userId": "user-456",
  "amount": 100000,
  "currency": "VND",
  "method": "card",
  "provider": "zalopay",
  "metadata": {
    "note": "Taxi ride payment"
  }
}
```

### Create Payment Response
```json
{
  "paymentId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "providerPaymentId": "ZP1737389288123",
  "requiresAction": false
}
```

### Kafka Event (payment.completed)
```json
{
  "eventId": "outbox-event-uuid",
  "aggregateType": "PAYMENT",
  "aggregateId": "payment-uuid",
  "type": "payment.completed",
  "payload": {
    "paymentId": "payment-uuid",
    "rideId": "ride-123",
    "userId": "user-456",
    "amount": 100000,
    "currency": "VND",
    "status": "SUCCEEDED",
    "provider": "zalopay",
    "providerPaymentId": "ZP1737389288123"
  },
  "timestamp": "2026-01-20T22:40:00Z"
}
```

## 🎓 Key Takeaways

1. **Atomicity**: Payment update + Outbox event trong 1 transaction
2. **Idempotency**: Tránh duplicate payment/webhook processing
3. **Reliability**: Retry logic + Outbox pattern đảm bảo event delivery
4. **Observability**: Correlation ID + Metrics tracking
5. **Extensibility**: Provider adapter pattern dễ thêm provider mới
