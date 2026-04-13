const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'cab_booking_topic';

let channel = null;
let connection = null;

async function connectProducer(delay = 3000) {
    let attempt = 0;
    while (true) {
        attempt++;
        try {
            console.log(`[RabbitMQ] Review Service producer: Connection attempt ${attempt}...`);
            connection = await amqp.connect(RABBITMQ_URL);
            channel = await connection.createChannel();
            await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
            console.log('✓ Review Service producer connected to RabbitMQ');

            // Handle connection close -> reconnect
            connection.on('close', () => {
                console.error('[RabbitMQ] Review producer: Connection closed. Reconnecting...');
                channel = null;
                connection = null;
                connectProducer();
            });

            connection.on('error', (err) => {
                console.error('[RabbitMQ] Review producer: Connection error:', err.message);
            });

            return channel;
        } catch (error) {
            console.error(`✗ Review producer: RabbitMQ connection attempt ${attempt} failed:`, error.message);
            const nextDelay = Math.min(delay * Math.pow(1.2, attempt), 30000);
            console.log(`   Retrying in ${Math.round(nextDelay / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, nextDelay));
        }
    }
}

async function getChannel() {
    if (channel) return channel;
    return await connectProducer();
}

/**
 * Publish a generic event to the exchange
 */
async function publishEvent(routingKey, data) {
    try {
        const ch = await getChannel();
        const payload = JSON.stringify(data);
        ch.publish(EXCHANGE_NAME, routingKey, Buffer.from(payload));
        console.log(`[RabbitMQ] Published event '${routingKey}':`, data);
    } catch (error) {
        console.error(`[RabbitMQ] Failed to publish event '${routingKey}':`, error);
    }
}

/**
 * Convenience method to publish review submitted event
 */
async function publishReviewSubmitted(reviewData) {
    await publishEvent('review.submitted', reviewData);
}

module.exports = {
    connectProducer,
    publishReviewSubmitted
};
