const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

let connection = null;
let channel = null;

// Exchange and Queue names
const RIDE_EXCHANGE = 'ride.topic';
const PAYMENT_EXCHANGE = 'payment.topic';
const NOTIFICATION_QUEUE = 'notification.events.queue';

// All routing keys this service consumes
const ROUTING_KEYS = {
    RIDE_ASSIGNED: 'ride.assigned',
    RIDE_ACCEPTED: 'ride.accepted',
    RIDE_REJECTED: 'ride.rejected',
    RIDE_CANCELLED: 'ride.cancelled',
    RIDE_STARTED: 'ride.started',
    RIDE_COMPLETED: 'ride.completed',
    RIDE_MATCH_FAILED: 'ride.match_failed',
    PAYMENT_COMPLETED: 'payment.completed',
    PAYMENT_FAILED: 'payment.failed'
};

async function connectRabbitMQ(retries = 0, delay = 3000) {
    let attempt = 0;
    while (true) {
        attempt++;
        try {
            console.log(`[RabbitMQ] Notification Service: Connection attempt ${attempt}...`);
            connection = await amqp.connect(RABBITMQ_URL);
            channel = await connection.createChannel();

            // Declare exchanges
            await channel.assertExchange(RIDE_EXCHANGE, 'topic', { durable: true });
            await channel.assertExchange(PAYMENT_EXCHANGE, 'topic', { durable: true });

            // Declare notification queue
            await channel.assertQueue(NOTIFICATION_QUEUE, { durable: true });

            // Bind queue to routing keys based on prefix
            for (const [name, key] of Object.entries(ROUTING_KEYS)) {
                if (key.startsWith('payment.')) {
                    await channel.bindQueue(NOTIFICATION_QUEUE, PAYMENT_EXCHANGE, key);
                    console.log(`  ✓ Bound queue to PAYMENT_EXCHANGE with key: ${key}`);
                } else {
                    await channel.bindQueue(NOTIFICATION_QUEUE, RIDE_EXCHANGE, key);
                    console.log(`  ✓ Bound queue to RIDE_EXCHANGE with key: ${key}`);
                }
            }

            // Bind Driver Location
            await channel.bindQueue(NOTIFICATION_QUEUE, RIDE_EXCHANGE, 'driver.location_updated');
            console.log(`  ✓ Bound queue to RIDE_EXCHANGE with key: driver.location_updated`);

            console.log('✓ RabbitMQ connected successfully');

            // Handle connection close
            connection.on('close', () => {
                console.error('RabbitMQ connection closed. Reconnecting...');
                channel = null;
                connectRabbitMQ();
            });

            return channel;
        } catch (error) {
            console.error(`✗ RabbitMQ connection attempt ${attempt} failed:`, error.message);
            const nextDelay = Math.min(delay * Math.pow(1.2, attempt), 30000);
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

function getRoutingKeys() {
    return ROUTING_KEYS;
}

function getQueueName() {
    return NOTIFICATION_QUEUE;
}

module.exports = {
    connectRabbitMQ,
    getChannel,
    getExchangeName,
    getRoutingKeys,
    getQueueName
};
