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
        authPolicy: 'protected',
        roles: ['PASSENGER'], // Only passengers can check price
        description: 'Pricing Service'
    },

    driver: {
        url: process.env.DRIVER_SERVICE_URL || 'http://driver-service:3004',
        path: '/drivers',
        authPolicy: 'public', // TODO: Revert to protected after demo
        // Mixed roles: Drivers update location, Passengers find drivers
        description: 'Driver Service'
    },


    booking: {
        url: process.env.BOOKING_SERVICE_URL || 'http://booking-service:3006',
        path: '/bookings',
        authPolicy: 'protected',
        roles: ['PASSENGER'], // Only passengers can book
        description: 'Booking Service'
    },
    ride: {
        url: process.env.RIDE_SERVICE_URL || 'http://ride-service:3007',
        path: '/rides',
        authPolicy: 'protected',
        roles: ['PASSENGER', 'DRIVER'], // Both need access (view/update)
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
    review: {
        url: process.env.REVIEW_SERVICE_URL || 'http://review-service:3010',
        path: '/reviews',
        authPolicy: 'protected',
        roles: ['PASSENGER', 'DRIVER'], // Two-way reviews
        description: 'Review Service'
    },
    eta: {
        url: process.env.ETA_SERVICE_URL || 'http://eta-service:3012',
        path: '/eta',
        authPolicy: 'public', // ETA is public for demo, can be protected later
        description: 'ETA Calculation Service'
    },
    tracking: {
        url: process.env.TRACKING_SERVICE_URL || 'http://tracking-service:3011',
        path: '/tracking',
        authPolicy: 'public', // Tracking is public for demo, can be protected later
        description: 'Realtime Tracking Service'
    },
};

module.exports = services;
