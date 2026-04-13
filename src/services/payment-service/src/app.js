require('dotenv').config();
const express = require('express');
const cors = require('cors');
const paymentRoutes = require('./routes/payments');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'payment-service',
        timestamp: new Date().toISOString()
    });
});

// Mount routes
// Gateway strips /payments prefix, so mount at root
app.use('/', paymentRoutes);
// PSP Webhook endpoint - receives async callbacks from Mock PSP (or real Stripe/Momo)
app.use('/api/webhooks', webhookRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Payment Service: Route not found'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error'
    });
});

module.exports = app;
