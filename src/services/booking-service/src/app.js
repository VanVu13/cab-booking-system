require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bookingRoutes = require('./routes/bookings');

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
        service: 'booking-service',
        timestamp: new Date().toISOString()
    });
});

// Mount routes at root (Gateway strips /bookings prefix)
app.use('/', bookingRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Booking Service: Route not found'
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
