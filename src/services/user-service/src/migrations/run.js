const sequelize = require('../config/database');

async function runMigrations() {
    try {
        console.log('Running migrations for User Service...');

        // Use raw SQL or sequelize.sync for simplicity in this context
        // Creating tables if they don't exist

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS users_profile (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                phone VARCHAR(20),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS drivers_profile (
                id UUID PRIMARY KEY,
                driver_id UUID NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                phone VARCHAR(20),
                license_number VARCHAR(100),
                vehicle_details JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✓ User Service migrations completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('✗ Migration failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    runMigrations();
}

module.exports = { runMigrations };
