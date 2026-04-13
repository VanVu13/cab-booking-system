const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const EXCHANGE_NAME = 'ride.topic';

async function initRabbitMQ(onLocationUpdate) {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

        const q = await channel.assertQueue('', { exclusive: true });

        // Bind để nhận sự kiện vị trí tài xế và TẤT CẢ trạng thái liên quan đến chuyến xe
        await channel.bindQueue(q.queue, EXCHANGE_NAME, 'driver.location_updated');
        await channel.bindQueue(q.queue, EXCHANGE_NAME, 'ride.#'); // Listen to all ride events (created, assigned, arrived, etc.)

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

    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
        // Retry logic có thể thêm ở đây
    }
}

module.exports = { initRabbitMQ };
