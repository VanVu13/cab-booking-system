const amqp = require('amqplib');

let channel = null;
let connection = null;

const QUEUES = {
    RIDE_ASSIGNED: 'driver.ride.assigned.queue',
    RIDE_CANCELLED: 'driver.ride.cancelled.queue',
    PAYMENT_COMPLETED: 'driver.payment.completed.queue'
};

const EXCHANGES = {
    RIDE_EVENTS: 'ride.topic',
    PAYMENT_EVENTS: 'payment.topic'
};

async function connectRabbitMQ(retries = 0, delay = 3000) {
    const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    let attempt = 0;

    while (true) {
        attempt++;
        try {
            console.log(`[RabbitMQ] Driver Service: Connection attempt ${attempt}...`);
            connection = await amqp.connect(RABBITMQ_URL);
            channel = await connection.createChannel();

            // Assert exchanges
            await channel.assertExchange(EXCHANGES.RIDE_EVENTS, 'topic', { durable: true });
            await channel.assertExchange(EXCHANGES.PAYMENT_EVENTS, 'topic', { durable: true });

            // Assert queues
            await channel.assertQueue(QUEUES.RIDE_ASSIGNED, { durable: true });
            await channel.assertQueue(QUEUES.RIDE_CANCELLED, { durable: true });
            await channel.assertQueue(QUEUES.PAYMENT_COMPLETED, { durable: true });

            // Bind queues
            await channel.bindQueue(QUEUES.RIDE_ASSIGNED, EXCHANGES.RIDE_EVENTS, 'ride.assigned');
            await channel.bindQueue(QUEUES.RIDE_CANCELLED, EXCHANGES.RIDE_EVENTS, 'ride.cancelled');
            await channel.bindQueue(QUEUES.PAYMENT_COMPLETED, EXCHANGES.PAYMENT_EVENTS, 'payment.completed');

            console.log('✓ Driver Service: RabbitMQ connected and queues initialized');

            connection.on('close', () => {
                console.error('RabbitMQ connection closed. Reconnecting...');
                channel = null;
                connectRabbitMQ();
            });

            return channel;
        } catch (error) {
            console.error(`✗ Driver Service: RabbitMQ connection attempt ${attempt} failed:`, error.message);
            const nextDelay = Math.min(delay * Math.pow(1.2, attempt), 30000);
            await new Promise(resolve => setTimeout(resolve, nextDelay));
        }
    }
}

function getChannel() {
    return channel;
}

module.exports = {
    connectRabbitMQ,
    getChannel,
    QUEUES,
    EXCHANGES
};
