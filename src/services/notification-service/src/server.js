require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/database');
const { connectRabbitMQ } = require('./config/rabbitmq');
const { startConsuming } = require('./events/consumer');

const PORT = process.env.PORT || 3009;

async function startServer() {
    try {
        console.log('======================================');
        console.log('  Notification Service Starting');
        console.log('======================================');

        // 1. Connect to MongoDB
        await connectDB();

        // 2. Connect to RabbitMQ
        const channel = await connectRabbitMQ();

        // 3. Start consuming events
        if (channel) {
            await startConsuming();
        }

        // 4. Start HTTP server
        const server = app.listen(PORT, () => {
            console.log(`✓ Notification Service running on port ${PORT}`);
            console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`✓ Health check: http://localhost:${PORT}/health`);
        });

        // 5. Initialize WebSocket
        const { initWebSocket } = require('./websocket/wsHandler');
        initWebSocket(server);

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received: closing server');
            server.close(() => {
                console.log('HTTP server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('SIGINT received: closing server');
            server.close(() => {
                console.log('HTTP server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('✗ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
