require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'auth-service',
        timestamp: new Date().toISOString()
    });
});

// Mount routes
app.use('/', authRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Auth Service: Route not found'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Error:', error);

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

module.exports = app;
