const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const services = require('../config/services');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { authLimiter } = require('../middleware/rateLimit');
const { registerSchema, loginSchema } = require('../middleware/validator');

/**
 * Create proxy middleware for a service
 */
function createServiceProxy(serviceName, serviceConfig) {
    // Explicit path filtering and rewriting
    return createProxyMiddleware(serviceConfig.path, {
        target: serviceConfig.url,
        changeOrigin: true,
        timeout: 20000,
        proxyTimeout: 20000,
        pathRewrite: {
            [`^${serviceConfig.path}`]: ''
        },
        onProxyReq: (proxyReq, req, res) => {
            // Forward headers
            if (req.headers['x-user-id'] || (req.user && req.user.userId)) {
                const userId = req.headers['x-user-id'] || req.user.userId;
                const role = req.headers['x-user-role'] || req.user.role;
                const email = req.headers['x-user-email'] || (req.user && req.user.email);

                proxyReq.setHeader('x-user-id', userId || '');
                proxyReq.setHeader('x-user-role', role || '');
                proxyReq.setHeader('x-user-email', email || '');
            }

            // Forward Correlation ID
            if (req.correlationId) {
                proxyReq.setHeader('x-correlation-id', req.correlationId);
            }

            console.log(`[GATEWAY PROXY] ${serviceName}: ${req.method} ${req.originalUrl} -> ${serviceConfig.url}${proxyReq.path}`);

            if (req.body) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
                proxyReq.end();
            }
        },
        onError: (err, req, res) => {
            console.error(`[GATEWAY ERROR] ${serviceName}:`, err.message);
            if (!res.headersSent) {
                res.status(502).json({
                    error: 'Bad Gateway',
                    message: `${serviceConfig.description} is currently unavailable`
                });
            }
        }
    });
}

function setupRoutes(app) {
    // Manual Proxy for Maps (Nominatim) to bypass CORS
    app.use('/maps', createProxyMiddleware({
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        pathRewrite: {
            '^/maps/reverse-geocode': '/reverse',
            '^/maps/search': '/search'
        },
        onProxyReq: (proxyReq, req, res) => {
            // Nominatim requires a valid User-Agent
            proxyReq.setHeader('User-Agent', 'CabBookingSystem/1.0');
            // Remove headers that might confuse Nominatim or trigger blocks
            proxyReq.removeHeader('Origin');
            proxyReq.removeHeader('Referer');
            proxyReq.removeHeader('x-user-id');
            proxyReq.removeHeader('x-user-role');
            proxyReq.removeHeader('x-user-email');
            proxyReq.removeHeader('Authorization');
        }
    }));

    // Tracking Socket Proxy
    const trackingSocketProxy = createProxyMiddleware('/tracking-socket', {
        target: services.tracking.url,
        changeOrigin: true,
        ws: true,
        logLevel: 'debug'
    });
    app.use('/tracking-socket', trackingSocketProxy);

    // Notification Socket Proxy (Original /socket.io)
    const notificationSocketProxy = createProxyMiddleware('/socket.io', {
        target: services.notification.url,
        changeOrigin: true,
        ws: true,
        logLevel: 'debug'
    });
    app.use('/socket.io', notificationSocketProxy);

    const proxies = {
        trackingSocket: trackingSocketProxy,
        notificationSocket: notificationSocketProxy
    };

    Object.keys(services).forEach(name => {
        const config = services[name];
        if (config) {
            console.log(`[GATEWAY SETUP] Service: ${name}, Policy: ${config.authPolicy}`);
            let middleware = [];

            // FORCE PUBLIC for driver service debugging
            if (name === 'driver') {
                config.authPolicy = 'public';
                console.log('[GATEWAY DEBUG] Forced driver service to PUBLIC');
            }

            // Declarative middleware selection based on authPolicy
            switch (config.authPolicy) {
                case 'admin':
                    middleware = [authenticateToken, authorizeRoles('ADMIN')];
                    break;
                case 'protected':
                    middleware = [authenticateToken];
                    // Inject Role-Based Access Control if defined
                    if (config.roles && config.roles.length > 0) {
                        middleware.push(authorizeRoles(...config.roles));
                    }
                    break;
                case 'public':
                    middleware = [optionalAuth];
                    break;
                default:
                    // Fallback to protected for security if not specified
                    middleware = [authenticateToken];
                    break;
            }

            // 1. Apply middleware only to this path prefix
            app.use(config.path, ...middleware);

            // 2. Apply proxy middleware (filtered by config.path internally)
            app.use(createServiceProxy(name, config));
        }
    });

    console.log('✓ API Gateway: All microservice routes configured');
    return proxies;
}

module.exports = { setupRoutes };
