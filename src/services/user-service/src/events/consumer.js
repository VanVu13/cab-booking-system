const amqp = require('amqplib');
const DriverProfile = require('../models/DriverProfile');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const EXCHANGE_NAME = 'cab_booking_topic';
const QUEUE_NAME = 'user.review.submitted.queue';

async function startConsumer(delay = 3000) {
    let attempt = 0;
    while (true) {
        attempt++;
        try {
            console.log(`[RabbitMQ] User Service consumer: Connection attempt ${attempt}...`);
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

            console.log(`✓ User Service consumer connected to RabbitMQ (Queue: ${QUEUE_NAME})`);

            channel.consume(q.queue, async (msg) => {
                if (msg !== null) {
                    try {
                        const eventData = JSON.parse(msg.content.toString());
                        const routingKey = msg.fields.routingKey;

                        console.log(`[User Service] Received event '${routingKey}':`, eventData);

                        // Update driver rating
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

            // Handle connection close -> reconnect
            connection.on('close', () => {
                console.error('[RabbitMQ] User Service consumer: Connection closed. Reconnecting...');
                startConsumer();
            });

            connection.on('error', (err) => {
                console.error('[RabbitMQ] User Service consumer: Connection error:', err.message);
            });

            return; // Successfully connected, exit retry loop

        } catch (error) {
            console.error(`✗ User Service consumer: RabbitMQ connection attempt ${attempt} failed:`, error.message);
            const nextDelay = Math.min(delay * Math.pow(1.2, attempt), 30000);
            console.log(`   Retrying in ${Math.round(nextDelay / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, nextDelay));
        }
    }
}

module.exports = { startConsumer };
