require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');

const PORT = process.env.PORT || 3001;

// Test database connection and start server
async function startServer() {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✓ Database connection established successfully');

        // Sync models (create tables if they don\'t exist)
        // In production, use migrations instead
        await sequelize.sync({ alter: false });
        console.log('✓ Database models synchronized');

        // Start server
        const server = app.listen(PORT, () => {
            console.log(`✓ Auth Service running on port ${PORT}`);
            console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`✓ Health check: http://localhost:${PORT}/health`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM signal received: closing HTTP server');
            server.close(() => {
                console.log('HTTP server closed');
                sequelize.close().then(() => {
                    console.log('Database connection closed');
                    process.exit(0);
                });
            });
        });

        process.on('SIGINT', () => {
            console.log('SIGINT signal received: closing HTTP server');
            server.close(() => {
                console.log('HTTP server closed');
                sequelize.close().then(() => {
                    console.log('Database connection closed');
                    process.exit(0);
                });
            });
        });

    } catch (error) {
        console.error('✗ Unable to start server:', error);
        process.exit(1);
    }
}

startServer();
