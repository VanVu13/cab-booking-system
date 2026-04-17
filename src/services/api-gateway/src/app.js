const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');
const { apiLimiter, bookingLimiter } = require('./middleware/rateLimit');
const { setupRoutes } = require('./routes');

const app = express();

// 1. Correlation ID Middleware (Traceability) - MUST BE FIRST
app.use((req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || `cid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
});

// 2. Logging - IMMEDIATELY AFTER CORRELATION ID
app.use(morgan('dev'));
app.use((req, res, next) => {
    console.log(`[GATEWAY REQUEST] ${req.method} ${req.url}`);
    next();
});

// 3. Security & CORS
app.use(helmet());
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-driver-id', 'x-user-id']
}));

// 4. Body parsing
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Middleware to catch 413 error (Payload too large)
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Payload too large' });
    }
    next(err);
});
// CORS is now globally defined at the top

app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        console.log(`[GATEWAY BODY DEBUG] ${req.method} ${req.originalUrl} - Body Keys:`, Object.keys(req.body || {}));
    }
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
