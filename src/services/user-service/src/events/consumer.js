const amqp = require('amqplib');
const DriverProfile = require('../models/DriverProfile');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const EXCHANGE_NAME = 'cab_booking_topic';
const QUEUE_NAME = 'user.review.submitted.queue';

async function startConsumer() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

        // Assert Queue with DLX configuration
        const q = await channel.assertQueue(QUEUE_NAME, {
            durable: true,
            deadLetterExchange: 'user.dlx',
            deadLetterRoutingKey: 'user.dead.letter'
        });

        // Setup DLX & DLQ
        await channel.assertExchange('user.dlx', 'direct', { durable: true });
        await channel.assertQueue('user.dead.letter.queue', { durable: true });
        await channel.bindQueue('user.dead.letter.queue', 'user.dlx', 'user.dead.letter');

        await channel.bindQueue(q.queue, EXCHANGE_NAME, 'review.submitted');

        console.log(`[RabbitMQ] User Service listening for reviews on ${QUEUE_NAME}`);

        channel.consume(q.queue, async (msg) => {
            if (msg !== null) {
                try {
                    const eventData = JSON.parse(msg.content.toString());
                    const routingKey = msg.fields.routingKey;

                    console.log(`[User Service] Received event '${routingKey}':`, eventData);

                    // Xử lý cập nhật sao
                    if (routingKey === 'review.submitted' && eventData.driverId) {
                        await DriverProfile.update(
                            {
                                rating: eventData.newAverageRating,
                                reviewCount: eventData.newReviewCount
                            },
                            { where: { driverId: eventData.driverId } }
                        );
                        console.log(`[User Service] Updated driver ${eventData.driverId} with rating ${eventData.newAverageRating} (${eventData.newReviewCount} reviews)`);
                    }

                    channel.ack(msg);
                } catch (error) {
                    console.error('[User Service] Error processing message:', error);
                    // Nack and send to DLX
                    channel.nack(msg, false, false);
                }
            }
        });

    } catch (error) {
        console.error('[RabbitMQ] Consumer connect error:', error);
        // Retry logic
        setTimeout(startConsumer, 5000);
    }
}

module.exports = { startConsumer };
