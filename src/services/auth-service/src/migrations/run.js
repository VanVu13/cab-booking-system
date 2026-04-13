const sequelize = require('../config/database');

async function createUsersAuthTable() {
    try {
        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users_auth (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'PASSENGER' CHECK (role IN ('PASSENGER', 'DRIVER', 'ADMIN')),
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED', 'PENDING_APPROVAL', 'REJECTED', 'SUSPENDED')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

        await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_auth_email ON users_auth(email);
    `);

        console.log('✓ Migration: users_auth table created successfully');
    } catch (error) {
        console.error('✗ Migration failed:', error.message);
        throw error;
    }
}

async function addNameColumn() {
    try {
        await sequelize.query(`
            ALTER TABLE users_auth ADD COLUMN IF NOT EXISTS name VARCHAR(255);
        `);
        console.log('✓ Migration: name column check/added successfully');
    } catch (error) {
        console.error('✗ Migration addNameColumn failed:', error.message);
    }
}

async function runMigrations() {
    try {
        console.log('Running migrations...');
        await createUsersAuthTable();
        await addNameColumn();
        console.log('All migrations completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

// Run migrations if this file is executed directly
if (require.main === module) {
    runMigrations();
}

module.exports = { createUsersAuthTable, runMigrations };
