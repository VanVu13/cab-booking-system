import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

const register = new Registry();

// Collect default metrics
collectDefaultMetrics({ register });

// Custom metrics
export const paymentSuccessCounter = new Counter({
    name: 'payment_success_total',
    help: 'Total number of successful payments',
    labelNames: ['provider', 'method'],
    registers: [register],
});

export const paymentFailedCounter = new Counter({
    name: 'payment_failed_total',
    help: 'Total number of failed payments',
    labelNames: ['provider', 'method', 'failure_code'],
    registers: [register],
});

export const paymentAttemptsCounter = new Counter({
    name: 'payment_attempts_total',
    help: 'Total number of payment attempts',
    labelNames: ['provider', 'status'],
    registers: [register],
});

export const paymentProviderLatencyHistogram = new Histogram({
    name: 'payment_provider_latency_ms',
    help: 'Payment provider API call latency in milliseconds',
    labelNames: ['provider', 'operation'],
    buckets: [50, 100, 200, 500, 1000, 2000, 5000],
    registers: [register],
});

export const outboxEventsPublishedCounter = new Counter({
    name: 'outbox_events_published_total',
    help: 'Total number of outbox events published',
    labelNames: ['event_type'],
    registers: [register],
});

export const outboxEventsFailedCounter = new Counter({
    name: 'outbox_events_failed_total',
    help: 'Total number of outbox events that failed to publish',
    registers: [register],
});

export { register };
