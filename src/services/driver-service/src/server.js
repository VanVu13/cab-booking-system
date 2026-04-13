require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('./config/database');
const { connectRabbitMQ } = require('./config/rabbitmq');
const { startConsuming } = require('./events/consumer');
const { startPaymentConsumer } = require('./events/paymentConsumer');
const driverRoutes = require('./routes/drivers');
const walletController = require('./controllers/walletController');
const { initWebSocket, getConnectedDrivers } = require('./websocket/wsHandler');

// Import models to ensure Sequelize syncs them
require('./models/DriverProfile');

const app = express();
const PORT = process.env.PORT || 3004;

// Create HTTP server for both Express and WebSocket
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'driver-service',
        connectedDrivers: getConnectedDrivers().length,
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/drivers/me/wallet', (req, res, next) => {
    // Mini router for wallet since it has different structure 
    if (req.method === 'GET' && req.path === '/') return walletController.getWalletBalance(req, res);
    if (req.method === 'GET' && req.path === '/transactions') return walletController.getWalletTransactions(req, res);
    next();
});
app.use('/drivers', driverRoutes); // Internal/Direct calls
app.use('/', driverRoutes);        // Gateway calls (prefix stripped)

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Driver Service: Route not found' });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
});

// Start server
async function startServer() {
    try {
        await connectDatabase();

        // Initialize RabbitMQ
        await connectRabbitMQ();
        startConsuming();
        startPaymentConsumer(); // Bổ sung hứng event payment.completed

        // Initialize WebSocket
        initWebSocket(server);

        server.listen(PORT, () => {
            console.log('=================================');
            console.log('  Driver Service Starting');
            console.log('=================================');
            console.log(`✓ Driver Service running on port ${PORT}`);
            console.log(`✓ WebSocket available at ws://localhost:${PORT}/ws`);
            console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
