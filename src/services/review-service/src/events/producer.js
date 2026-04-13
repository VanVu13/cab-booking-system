const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'cab_booking_topic';

let channel = null;

async function getChannel() {
    if (channel) return channel;
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        console.log('[RabbitMQ] Review Service producer connected');
        return channel;
    } catch (error) {
        console.error('[RabbitMQ] Producer connection error:', error);
        throw error;
    }
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
    publishReviewSubmitted
};
