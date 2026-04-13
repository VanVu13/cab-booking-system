require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rideRoutes = require('./routes/rides');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log('[' + new Date().toISOString() + '] ' + req.method + ' ' + req.originalUrl);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'ride-service',
        timestamp: new Date().toISOString()
    });
});

// Mount routes 1
app.use('/rides', rideRoutes); // Support legacy/gateway format
app.use('/', rideRoutes);      // Support direct service-to-service format

// 404 handler
app.use((req, res) => {
    console.error('[404 NOT FOUND] ' + req.method + ' ' + req.originalUrl);
    res.status(404).json({
        error: 'Ride Service: Route not found',
        method: req.method,
        path: req.originalUrl
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
