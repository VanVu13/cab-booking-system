require('dotenv').config();
const express = require('express');
const cors = require('cors');
const notificationRoutes = require('./routes/notifications');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'notification-service',
        timestamp: new Date().toISOString()
    });
});

// Routes
// Note: Gateway forwards /notifications/* -> /notifications
// But usually gateway strips prefix? 
// Checking api-gateway config services.js: path: '/notifications'
// Usually microservices mount at root '/' if gateway strips prefix.
// If gateway configuration is:
//     path: '/notifications', target: 'http://notification-service:3009'
// Then request to /notifications/foo goes to /foo on service (if strip_path is true).
// Based on payment-service app.js: "Gateway strips /payments prefix, so mount at root".
// So I will mount at root.
app.use('/', notificationRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Notification Service: Route not found'
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error'
    });
});

module.exports = app;
