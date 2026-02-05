require('dotenv').config();

const services = {
    auth: {
        url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
        path: '/auth',
        authPolicy: 'public', // No token required, but forwarded if exists
        description: 'Authentication Service'
    },
    user: {
        url: process.env.USER_SERVICE_URL || 'http://user-service:3002',
        path: '/users',
        authPolicy: 'protected', // Requires valid token
        description: 'User Profile Service'
    },
    pricing: {
        url: process.env.PRICING_SERVICE_URL || 'http://pricing-service:3003',
        path: '/pricing',
        authPolicy: 'public',
        description: 'Pricing Service'
    },
    eta: {
        url: process.env.ETA_SERVICE_URL || 'http://eta-service:3004',
        path: '/eta',
        authPolicy: 'public',
        description: 'ETA Estimation Service'
    },
    matching: {
        url: process.env.MATCHING_SERVICE_URL || 'http://matching-service:3005',
        path: '/matching',
        authPolicy: 'protected',
        description: 'AI Matching Service'
    },
    booking: {
        url: process.env.BOOKING_SERVICE_URL || 'http://booking-service:3006',
        path: '/bookings',
        authPolicy: 'protected',
        description: 'Booking Service'
    },
    ride: {
        url: process.env.RIDE_SERVICE_URL || 'http://ride-service:3007',
        path: '/rides',
        authPolicy: 'protected',
        description: 'Ride Service'
    },
    payment: {
        url: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3008',
        path: '/payments',
        authPolicy: 'protected',
        description: 'Payment Service'
    },
    notification: {
        url: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3009',
        path: '/notifications',
        authPolicy: 'protected',
        description: 'Notification Service'
    },
    admin: {
        url: process.env.ADMIN_SERVICE_URL || 'http://admin-service:3010',
        path: '/admin',
        authPolicy: 'admin', // Requires Admin role
        description: 'Admin Service'
    }
};

module.exports = services;
