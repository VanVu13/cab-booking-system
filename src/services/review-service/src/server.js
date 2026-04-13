require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');

const PORT = process.env.PORT || 3010;

async function startServer() {
    try {
        console.log('=================================');
        console.log('  Review Service Starting');
        console.log('=================================');

        // 1. Connect to PostgreSQL and sync models
        await sequelize.authenticate();
        console.log('✓ PostgreSQL connected successfully');

        // Sync models (create tables if they don't exist)
        await sequelize.sync({ alter: true });
        console.log('✓ Database models synced');

        // 2. Connect RabbitMQ producer (non-blocking, retries in background)
        const { connectProducer } = require('./events/producer');
        connectProducer().catch(err => {
            console.error('✗ RabbitMQ producer initial connection failed (will retry):', err.message);
        });

        // 3. Start HTTP server
        const server = app.listen(PORT, () => {
            console.log(`✓ Review Service running on port ${PORT}`);
            console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`✓ Health check: http://localhost:${PORT}/health`);
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
