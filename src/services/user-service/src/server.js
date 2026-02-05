const app = require('./app');
const sequelize = require('./config/database');
require('dotenv').config();

const PORT = process.env.PORT || 3002;

async function startServer() {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✓ Database connection has been established successfully.');

        // Sync models (in development)
        // Note: For production, use proper migrations
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            console.log('✓ Database models synchronized.');
        }

        app.listen(PORT, () => {
            console.log(`✓ User Service is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('✗ Unable to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await sequelize.close();
    process.exit(0);
});

startServer();
