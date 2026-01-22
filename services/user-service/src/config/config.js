require('dotenv').config();

const config = {
    // Server
    port: parseInt(process.env.PORT) || 3002,
    nodeEnv: process.env.NODE_ENV || 'development',
    serviceName: process.env.SERVICE_NAME || 'user-service',

    // Database
    mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/cab_user_db',
    mongoTestURI: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cab_user_test_db',

    // JWT
    jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret_change_in_production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

    // External Services
    authServiceURL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    bookingServiceURL: process.env.BOOKING_SERVICE_URL || 'http://localhost:3003',
    paymentServiceURL: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    },

    // CORS
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
    logToFile: process.env.LOG_TO_FILE === 'true',
};

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
        console.warn(`⚠️  Warning: ${envVar} is not set in environment variables`);
    }
});

module.exports = config;