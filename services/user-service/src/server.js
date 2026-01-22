const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const userRoutes = require('./routes/userRoutes');
const config = require('./config/config');
const logger = require('./utils/logger');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: config.corsOrigin ? config.corsOrigin.split(',') : '*',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url} - ${req.ip}`);
    next();
});

// Routes
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        service: config.serviceName,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API Documentation
app.get('/api-docs', (req, res) => {
    res.json({
        service: 'User Service',
        version: '1.0.0',
        endpoints: {
            users: {
                GET: '/api/users',
                GET_ONE: '/api/users/:id',
                POST: '/api/users',
                PUT: '/api/users/:id',
                DELETE: '/api/users/:id',
            },
            health: '/health'
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// Basic error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Connect to MongoDB
const connectDB = async() => {
    try {
        await mongoose.connect(config.mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        logger.info(`✅ Connected to MongoDB: ${config.mongoURI}`);
    } catch (error) {
        logger.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
};

// Start server
const startServer = async() => {
    try {
        await connectDB();

        app.listen(config.port, () => {
            logger.info(`🚀 User Service running in ${config.nodeEnv} mode`);
            logger.info(`📡 Listening on port ${config.port}`);
            logger.info(`🔗 Health: http://localhost:${config.port}/health`);
            logger.info(`📚 API Docs: http://localhost:${config.port}/api-docs`);
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;