const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

let connection = null;
let channel = null;

// Exchange and Queue names
const RIDE_EXCHANGE = 'ride.topic';
const RIDE_ASSIGNED_KEY = 'ride.assigned';
const RIDE_ACCEPTED_KEY = 'ride.accepted';
const RIDE_REJECTED_KEY = 'ride.rejected';
const RIDE_ARRIVED_KEY = 'ride.arrived';
const RIDE_STARTED_KEY = 'ride.started';
const RIDE_COMPLETED_KEY = 'ride.completed';
const RIDE_QUEUE = 'ride.ride.assigned.queue';

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
            await channel.assertQueue(RIDE_QUEUE, { durable: true });
            await channel.bindQueue(RIDE_QUEUE, RIDE_EXCHANGE, RIDE_ASSIGNED_KEY);

            console.log('✓ RabbitMQ connected successfully');

            // Handle connection close
            connection.on('close', () => {
                console.error('RabbitMQ connection closed. Attempting to reconnect...');
                channel = null;
                connectRabbitMQ(); // Self-reconnect
            });

            return channel;
        } catch (error) {
            console.error(`✗ RabbitMQ connection attempt ${attempt} failed:`, error.message);
            const nextDelay = Math.min(delay * Math.pow(1.2, attempt), 30000);
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
        RIDE_ASSIGNED: RIDE_ASSIGNED_KEY,
        RIDE_ACCEPTED: RIDE_ACCEPTED_KEY,
        RIDE_REJECTED: RIDE_REJECTED_KEY,
        RIDE_ARRIVED: RIDE_ARRIVED_KEY,
        RIDE_STARTED: RIDE_STARTED_KEY,
        RIDE_COMPLETED: RIDE_COMPLETED_KEY
    };
}

function getQueueName() {
    return RIDE_QUEUE;
}

module.exports = {
    connectRabbitMQ,
    getChannel,
    getExchangeName,
    getRoutingKeys,
    getQueueName
};
