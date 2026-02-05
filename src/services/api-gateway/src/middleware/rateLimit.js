const rateLimit = require('express-rate-limit');

/**
 * Standard rate limiter for all API requests
 * Limits each IP to 100 requests per 15 minutes window
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        error: 'Too many requests',
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    skip: (req) => req.path === '/health' // Don't rate limit health checks
});

/**
 * Stricter rate limiter for authentication routes (login/register)
 * Limits each IP to 5 attempts per 15 minutes window
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many authentication attempts',
        message: 'Too many login or register attempts from this IP, please try again after 15 minutes'
    }
});

module.exports = {
    apiLimiter,
    authLimiter
};
