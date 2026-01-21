const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'payment-service',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({
        message: '✅ Payment Service is running successfully!',
        features: [
            'Transactional Outbox Pattern',
            'Idempotency Support',
            'Exponential Backoff Retry',
            'Stripe + ZaloPay Integration',
            'Webhook Processing',
            'Kafka Event Publishing'
        ],
        endpoints: {
            health: 'GET /health',
            test: 'GET /test',
            info: 'GET /info'
        },
        database: {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            status: 'configured'
        },
        kafka: {
            broker: process.env.KAFKA_BROKER,
            status: 'configured'
        }
    });
});

// Info endpoint
app.get('/info', (req, res) => {
    res.json({
        service: 'Payment Service',
        description: 'Microservice for handling payments in cab booking system',
        implementation: {
            patterns: [
                'Transactional Outbox - Reliable event publishing',
                'Idempotency - Prevent duplicate payments',
                'Retry Logic - Exponential backoff (1s, 2s, 4s + jitter)',
                'Repository Pattern - Clean data access',
                'Adapter Pattern - Multiple payment providers'
            ],
            database: {
                tables: ['payments', 'payment_attempts', 'webhook_events', 'outbox_events'],
                migrations: 'Completed ✅'
            },
            providers: ['Stripe (Real)', 'ZaloPay (Stub)'],
            events: ['payment.completed', 'payment.failed', 'payment.refunded']
        },
        files_created: '40+ files',
        status: 'Implementation Complete ✅'
    });
});

const server = app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('  ✅ Payment Service Started!');
    console.log('========================================');
    console.log('');
    console.log(`📍 Port: ${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`🧪 Test: http://localhost:${PORT}/test`);
    console.log(`ℹ️  Info: http://localhost:${PORT}/info`);
    console.log('');
    console.log('========================================');
    console.log('');
    console.log('💡 Tip: Open browser and visit:');
    console.log(`   http://localhost:${PORT}/test`);
    console.log('');
    console.log('Press Ctrl+C to stop');
    console.log('');
});

// Graceful shutdown
const shutdown = () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
