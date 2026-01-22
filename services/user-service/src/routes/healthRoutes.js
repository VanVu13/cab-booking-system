const express = require('express');
const router = express.Router();
const config = require('../config/config');

// Simple health check
router.get('/', (req, res) => {
    res.status(200).json({
        status: 'UP',
        service: config.serviceName,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Detailed health check
router.get('/detailed', (req, res) => {
    const health = {
        status: 'UP',
        service: config.serviceName,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config.nodeEnv,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        dependencies: {
            node: process.version,
            express: require('express/package.json').version,
            mongoose: require('mongoose/package.json').version
        }
    };
    res.status(200).json(health);
});

module.exports = router;