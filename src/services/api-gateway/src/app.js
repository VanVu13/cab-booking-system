const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');
const { apiLimiter, bookingLimiter } = require('./middleware/rateLimit');
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
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Middleware to catch 413 error (Payload too large)
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Payload too large' });
    }
    next(err);
});
// CORS - Allow ALL for debugging
app.use(cors({
    origin: true, // Reflects the request origin
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

// Rate limiting - global + route-specific
app.use(apiLimiter);                  // Global: 100 req/15min per IP
app.use('/bookings', bookingLimiter); // Booking: 30 req/min per IP

// Routes
const proxies = setupRoutes(app);
app.proxies = proxies;

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
