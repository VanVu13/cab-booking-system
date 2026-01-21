import dotenv from 'dotenv';
dotenv.config();

import { OutboxWorker } from './outbox.worker';
import logger from '../utils/logger';
import { closeDb } from '../utils/db';
import { disconnectKafkaProducer } from '../kafka/producer';

const worker = new OutboxWorker();

const main = async () => {
    try {
        logger.info('Starting outbox worker process');
        await worker.start();
    } catch (error: any) {
        logger.error({ error: error.message }, 'Failed to start outbox worker');
        process.exit(1);
    }
};

// Graceful shutdown
const shutdown = async () => {
    logger.info('Shutting down outbox worker...');

    try {
        await worker.stop();
        await disconnectKafkaProducer();
        await closeDb();
        logger.info('Outbox worker shut down gracefully');
        process.exit(0);
    } catch (error: any) {
        logger.error({ error: error.message }, 'Error during shutdown');
        process.exit(1);
    }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

main();
