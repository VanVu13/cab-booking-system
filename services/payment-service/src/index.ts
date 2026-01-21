import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import logger from './utils/logger';
import { closeDb } from './utils/db';
import { disconnectKafkaProducer } from './kafka/producer';

const PORT = process.env.PORT || 3003;

const app = createApp();

const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Payment service started');
});

// Graceful shutdown
const shutdown = async () => {
    logger.info('Shutting down payment service...');

    server.close(async () => {
        try {
            await disconnectKafkaProducer();
            await closeDb();
            logger.info('Payment service shut down gracefully');
            process.exit(0);
        } catch (error: any) {
            logger.error({ error: error.message }, 'Error during shutdown');
            process.exit(1);
        }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
