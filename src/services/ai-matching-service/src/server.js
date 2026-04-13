require('dotenv').config();
const { connectRabbitMQ } = require('./config/rabbitmq');
const { startConsuming } = require('./events/consumer');

const PORT = process.env.PORT || 3005;

async function startServer() {
    try {
        console.log('=================================');
        console.log('  AI Matching Service Starting');
        console.log('=================================');

        // 1. Connect to RabbitMQ
        const channel = await connectRabbitMQ();

        if (!channel) {
            console.error('✗ Failed to connect to RabbitMQ. Exiting...');
            process.exit(1);
        }

        // 2. Start consuming events
        await startConsuming();

        console.log(`✓ AI Matching Service running`);
        console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`✓ Mock dependencies: ${process.env.MOCK_DEPENDENCIES || 'false'}`);
        console.log('✓ Listening for ride.created events...');

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received: shutting down');
            process.exit(0);
        });

        process.on('SIGINT', () => {
            console.log('SIGINT received: shutting down');
            process.exit(0);
        });

    } catch (error) {
        console.error('✗ Failed to start service:', error);
        process.exit(1);
    }
}

startServer();
