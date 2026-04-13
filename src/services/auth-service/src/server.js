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

        // Seed default ADMIN user
        const User = require('./models/User');
        const { hashPassword } = require('./utils/password');
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const existingAdmin = await User.findOne({ where: { email: adminEmail } });

        if (!existingAdmin) {
            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
            const password_hash = await hashPassword(adminPassword);
            await User.create({
                email: adminEmail,
                password_hash,
                name: 'System Admin',
                role: 'ADMIN',
                status: 'ACTIVE'
            });
            console.log(`✓ Default admin created: ${adminEmail}`);
        }

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
