import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { register } from './utils/metrics';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'payment-service',
        timestamp: new Date().toISOString()
    });
});

// Metrics
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        const metrics = await register.metrics();
        res.send(metrics);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Simple test endpoint
app.get('/test', (req, res) => {
    res.json({
        message: 'Payment Service is running!',
        endpoints: {
            health: '/health',
            metrics: '/metrics',
            test: '/test'
        }
    });
});

const server = app.listen(PORT, () => {
    console.log(`✅ Payment service started on port ${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
    console.log(`🧪 Test: http://localhost:${PORT}/test`);
});

// Graceful shutdown
const shutdown = () => {
    console.log('Shutting down...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
