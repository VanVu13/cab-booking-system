require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');
const { connectRabbitMQ } = require('./config/rabbitmq');
const { startConsuming } = require('./events/consumer');

const PORT = process.env.PORT || 3008;

async function startServer() {
    try {
        console.log('=================================');
        console.log('  Payment Service Starting');
        console.log('=================================');

        // 1. Connect to PostgreSQL and sync models
        await sequelize.authenticate();
        console.log('✓ PostgreSQL connected successfully');

        // Sync models (create tables if they don't exist)
        // alter: true = add new columns without dropping data (safe for development)
        await sequelize.sync({ alter: true });
        console.log('✓ Database models synced');

        // 2. Connect to RabbitMQ
        const channel = await connectRabbitMQ();

        // 3. Start consuming events (if RabbitMQ connected)
        if (channel) {
            await startConsuming();
        }

        // 4. Start HTTP server
        const server = app.listen(PORT, () => {
            console.log(`✓ Payment Service running on port ${PORT}`);
            console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`✓ Health check: http://localhost:${PORT}/health`);
            console.log('✓ Listening for ride.completed events...');
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received: closing server');
            server.close(() => {
                sequelize.close();
                console.log('HTTP server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('SIGINT received: closing server');
            server.close(() => {
                sequelize.close();
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
