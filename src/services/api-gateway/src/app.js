const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');
const { apiLimiter } = require('./middleware/rateLimit');
const { setupRoutes } = require('./routes');

const app = express();

// Correlation ID Middleware (Traceability)
app.use((req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || `cid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
});

// Security
app.use(helmet());

// Body parsing (IMPORTANT)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));

// Logging
app.use(morgan('dev'));
app.use((req, res, next) => {
    console.log(`[GATEWAY REQUEST] ${req.method} ${req.url}`);
    next();
});
app.use((req, res, next) => {
    console.log(`[GATEWAY DEBUG] ${req.method} ${req.originalUrl} -> ${req.url}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'api-gateway' });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rate limit only for auth
app.use('/auth', apiLimiter);

// Routes
setupRoutes(app);

// 404
app.use((req, res) => {
    console.warn(`[GATEWAY 404] No match for: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'API Gateway: Route not found' });
});

// Error handler
app.use((error, req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.error('Gateway Error:', error);
    }
    res.status(error.statusCode || 500).json({
        error: error.message || 'Internal server error'
    });
});

module.exports = app;
