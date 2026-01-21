import { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const config: Knex.Config = {
    client: 'pg',
    connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5436'),
        database: process.env.DB_NAME || 'payment_db',
        user: process.env.DB_USER || 'payment_user',
        password: process.env.DB_PASSWORD || 'payment_pass',
    },
    pool: {
        min: 2,
        max: 10,
    },
    migrations: {
        directory: path.join(__dirname, '../../migrations'),
        extension: 'ts',
        tableName: 'knex_migrations',
    },
    seeds: {
        directory: path.join(__dirname, '../../seeds'),
        extension: 'ts',
    },
};

export default config;
