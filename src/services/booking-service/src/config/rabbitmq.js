const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

let connection = null;
let channel = null;

// Exchange and Queue names
const RIDE_EXCHANGE = 'ride.topic';
const RIDE_CREATED_KEY = 'ride.created';
const RIDE_ASSIGNED_KEY = 'ride.assigned';
const RIDE_ACCEPTED_KEY = 'ride.accepted';
const BOOKING_QUEUE = 'booking.ride.assigned.queue';

async function connectRabbitMQ(retries = 0, delay = 3000) {
    let attempt = 0;
    while (true) {
        attempt++;
        try {
            console.log(`[RabbitMQ] Connection attempt ${attempt}...`);
            connection = await amqp.connect(RABBITMQ_URL);
            channel = await connection.createChannel();

            // Declare exchange
            await channel.assertExchange(RIDE_EXCHANGE, 'topic', { durable: true });

            // Declare queue for consuming ride.assigned
            await channel.assertQueue(BOOKING_QUEUE, { durable: true });
            await channel.bindQueue(BOOKING_QUEUE, RIDE_EXCHANGE, RIDE_ASSIGNED_KEY);
            await channel.bindQueue(BOOKING_QUEUE, RIDE_EXCHANGE, RIDE_ACCEPTED_KEY);

            console.log('✓ RabbitMQ connected successfully');

            // Handle connection close
            connection.on('close', () => {
                console.error('RabbitMQ connection closed. Attempting to reconnect...');
                channel = null;
                connectRabbitMQ(); // Trigger self-reconnect
            });

            return channel;
        } catch (error) {
            console.error(`✗ RabbitMQ connection attempt ${attempt} failed:`, error.message);
            const nextDelay = Math.min(delay * Math.pow(1.2, attempt), 30000); // Exponential backoff up to 30s
            console.log(`   Retrying in ${Math.round(nextDelay / 1000)}s...`);
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
    return {
        RIDE_CREATED: RIDE_CREATED_KEY,
        RIDE_ASSIGNED: RIDE_ASSIGNED_KEY
    };
}

function getQueueName() {
    return BOOKING_QUEUE;
}

module.exports = {
    connectRabbitMQ,
    getChannel,
    getExchangeName,
    getRoutingKeys,
    getQueueName
};
