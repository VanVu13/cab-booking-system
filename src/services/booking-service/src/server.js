require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/database');
const { connectRabbitMQ } = require('./config/rabbitmq');
const { startConsuming } = require('./events/consumer');

const PORT = process.env.PORT || 3006;

async function startServer() {
    try {
        // 1. Connect to MongoDB
        await connectDB();

        // 2. Connect to RabbitMQ
        const channel = await connectRabbitMQ();

        // 3. Start consuming events (if RabbitMQ connected)
        if (channel) {
            await startConsuming();
        }

        // 4. Start HTTP server
        const server = app.listen(PORT, () => {
            console.log(`✓ Booking Service running on port ${PORT}`);
            console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`✓ Mock dependencies: ${process.env.MOCK_DEPENDENCIES || 'false'}`);
            console.log(`✓ Health check: http://localhost:${PORT}/health`);
        });

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
