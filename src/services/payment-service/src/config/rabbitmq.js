const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

let connection = null;
let channel = null;

// ==================== Exchange & Queue Definitions ====================
const RIDE_EXCHANGE = 'ride.topic';
const PAYMENT_EXCHANGE = 'payment.topic';

// Dead Letter Exchange (DLX) - catches messages that fail processing
const DLX_EXCHANGE = 'payment.dlx';
const DLQ_QUEUE = 'payment.dead.letter.queue';

// Main queues and routing keys
const RIDE_COMPLETED_KEY = 'ride.completed';
const PAYMENT_COMPLETED_KEY = 'payment.completed';
const PAYMENT_FAILED_KEY = 'payment.failed';
const PAYMENT_QUEUE = 'payment.ride.completed.queue';

// Max retry attempts before sending to DLQ
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Connect to RabbitMQ with exponential backoff and configure:
 *  - Main exchange (ride.topic & payment.topic)
 *  - Dead Letter Exchange (DLX) for failed messages
 *  - Dead Letter Queue (DLQ) to store unrecoverable messages
 *  - Payment queue with DLX config
 */
async function connectRabbitMQ() {
    let attempt = 0;
    const baseDelay = 3000;

    while (true) {
        attempt++;
        try {
            console.log(`[RabbitMQ] Payment Service: Connection attempt ${attempt}...`);
            connection = await amqp.connect(RABBITMQ_URL);
            channel = await connection.createChannel();

            // ---------- Setup Dead Letter Exchange (DLX) ----------
            // DLX receives messages that are NACK'd without requeue
            await channel.assertExchange(DLX_EXCHANGE, 'direct', { durable: true });

            // DLQ: stores failed messages for manual inspection / replay
            await channel.assertQueue(DLQ_QUEUE, {
                durable: true,
                arguments: {
                    'x-queue-type': 'classic'
                }
            });
            await channel.bindQueue(DLQ_QUEUE, DLX_EXCHANGE, PAYMENT_QUEUE);

            // ---------- Setup Main Exchanges ----------
            await channel.assertExchange(RIDE_EXCHANGE, 'topic', { durable: true });
            await channel.assertExchange(PAYMENT_EXCHANGE, 'topic', { durable: true });

            // ---------- Setup Main Payment Queue (with DLX config) ----------
            await channel.assertQueue(PAYMENT_QUEUE, {
                durable: true,
                arguments: {
                    // Route NACK'd (non-requeueable) messages to DLX
                    'x-dead-letter-exchange': DLX_EXCHANGE,
                    'x-dead-letter-routing-key': PAYMENT_QUEUE,
                    // Max retries via x-message-ttl + DLX trick (simple approach)
                    'x-message-ttl': 30000 // 30 seconds per attempt
                }
            });

            await channel.bindQueue(PAYMENT_QUEUE, RIDE_EXCHANGE, RIDE_COMPLETED_KEY);

            // Set prefetch to 1 for fair dispatch
            await channel.prefetch(1);

            console.log('✓ RabbitMQ connected successfully');
            console.log(`✓ DLX configured: '${DLX_EXCHANGE}' -> DLQ: '${DLQ_QUEUE}'`);
            console.log(`✓ Payment queue '${PAYMENT_QUEUE}' ready with DLX support`);

            // Handle connection close → reconnect
            connection.on('close', () => {
                console.error('[RabbitMQ] Connection closed. Reconnecting...');
                channel = null;
                connectRabbitMQ();
            });

            connection.on('error', (err) => {
                console.error('[RabbitMQ] Connection error:', err.message);
            });

            return channel;
        } catch (error) {
            console.error(`✗ RabbitMQ connection attempt ${attempt} failed:`, error.message);
            const nextDelay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), 30000);
            console.log(`  Retrying in ${Math.round(nextDelay / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, nextDelay));
        }
    }
}

function getChannel() {
    return channel;
}

function getExchangeName() {
    return RIDE_EXCHANGE;
}

function getPaymentExchangeName() {
    return PAYMENT_EXCHANGE;
}

function getRoutingKeys() {
    return {
        RIDE_COMPLETED: RIDE_COMPLETED_KEY,
        PAYMENT_COMPLETED: PAYMENT_COMPLETED_KEY,
        PAYMENT_FAILED: PAYMENT_FAILED_KEY
    };
}

function getQueueName() {
    return PAYMENT_QUEUE;
}

function getMaxRetryAttempts() {
    return MAX_RETRY_ATTEMPTS;
}

module.exports = {
    connectRabbitMQ,
    getChannel,
    getExchangeName,
    getPaymentExchangeName,
    getRoutingKeys,
    getQueueName,
    getMaxRetryAttempts
};
