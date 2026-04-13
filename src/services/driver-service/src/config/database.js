const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5434,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres_password',
    database: process.env.DB_DATABASE || 'cab_driver',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

async function connectDatabase() {
    try {
        await sequelize.authenticate();
        console.log('✓ PostgreSQL connected successfully');

        // Sync models
        await sequelize.sync({ alter: true });
        console.log('✓ Database models synchronized');
    } catch (error) {
        console.error('✗ Database connection failed:', error.message);
        throw error;
    }
}

module.exports = { sequelize, connectDatabase };
