const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const EXCHANGE_NAME = 'ride.topic';

let connection = null;

async function initRabbitMQ(onLocationUpdate, delay = 3000) {
    let attempt = 0;
    while (true) {
        attempt++;
        try {
            console.log(`[RabbitMQ] Tracking Service: Connection attempt ${attempt}...`);
            connection = await amqp.connect(RABBITMQ_URL);
            const channel = await connection.createChannel();

            await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

            const q = await channel.assertQueue('', { exclusive: true });

            // Bind to receive driver location events and ALL ride status events
            await channel.bindQueue(q.queue, EXCHANGE_NAME, 'driver.location_updated');
            await channel.bindQueue(q.queue, EXCHANGE_NAME, 'ride.#');

            console.log(`✓ Tracking Service connected to RabbitMQ (Queue: ${q.queue})`);

            channel.consume(q.queue, (msg) => {
                if (msg.content) {
                    try {
                        const data = JSON.parse(msg.content.toString());
                        const routingKey = msg.fields.routingKey;

                        onLocationUpdate({ ...data, routingKey });
                    } catch (err) {
                        console.error('Error parsing RabbitMQ message:', err);
                    }
                }
            }, { noAck: true });

            // Handle connection close -> reconnect
            connection.on('close', () => {
                console.error('[RabbitMQ] Tracking Service: Connection closed. Reconnecting...');
                connection = null;
                initRabbitMQ(onLocationUpdate);
            });

            connection.on('error', (err) => {
                console.error('[RabbitMQ] Tracking Service: Connection error:', err.message);
            });

            return; // Successfully connected, exit retry loop

        } catch (error) {
            console.error(`✗ Tracking Service: RabbitMQ connection attempt ${attempt} failed:`, error.message);
            const nextDelay = Math.min(delay * Math.pow(1.2, attempt), 30000);
            console.log(`   Retrying in ${Math.round(nextDelay / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, nextDelay));
        }
    }
}

module.exports = { initRabbitMQ };
