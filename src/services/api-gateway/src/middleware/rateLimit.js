const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Standard rate limiter for all API requests
 * DEV: 1000 req/15min | PROD: 100 req/15min
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 1000 : 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests',
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    skip: (req) => req.path === '/health'
});

/**
 * Stricter rate limiter for authentication routes (login/register)
 * DEV: 100 req/15min | PROD: 10 req/15min
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 100 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many authentication attempts',
        message: 'Too many login or register attempts from this IP, please try again after 15 minutes'
    }
});

/**
 * Booking-specific rate limiter
 * DEV: 100 req/min | PROD: 30 req/min
 */
const bookingLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: isDev ? 100 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many booking requests',
        message: 'Booking rate limit exceeded. Please try again shortly.'
    }
});

module.exports = {
    apiLimiter,
    authLimiter,
    bookingLimiter
};
