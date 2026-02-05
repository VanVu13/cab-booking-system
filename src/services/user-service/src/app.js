const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/users');

const app = express();

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[USER SERVICE] ${req.method} ${req.url}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'user-service' });
});

// Routes
app.use('/', userRoutes);

// 404 handler
app.use((req, res) => {
    console.warn(`[USER SERVICE 404] No match for: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'User Service: Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[USER SERVICE] Unhandled Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
