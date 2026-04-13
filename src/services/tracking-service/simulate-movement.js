/**
 * Driver Movement Simulator
 * Trách nhiệm: Giả lập tài xế gửi GPS về RabbitMQ dọc theo tuyến đường OSRM
 */
const amqp = require('amqplib');
const axios = require('axios');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'ride.topic';
const OSRM_URL = 'http://router.project-osrm.org/route/v1/driving';

async function simulate() {
    const driverId = 'driver-123';

    // 1. Tọa độ điểm đầu (Quận 10) và điểm cuối (Quận 5)
    const start = { lat: 10.762622, lng: 106.660172 };
    const end = { lat: 10.757000, lng: 106.667000 };

    console.log(`[Simulator] Fetching real road route from OSRM...`);
    const osrmRes = await axios.get(`${OSRM_URL}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`);
    const routeCoordinates = osrmRes.data.routes[0].geometry.coordinates;

    console.log(`[Simulator] Connecting to RabbitMQ...`);
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    console.log(`[Simulator] Starting movement simulation (${routeCoordinates.length} points)...`);

    for (let i = 0; i < routeCoordinates.length; i++) {
        const [lng, lat] = routeCoordinates[i];

        const payload = {
            driverId,
            lat,
            lng,
            timestamp: new Date().toISOString()
        };

        channel.publish(
            EXCHANGES.RIDE_EVENTS, // Sử dụng exchange name chuẩn của hệ thống
            'driver.location_updated',
            Buffer.from(JSON.stringify(payload))
        );

        console.log(`[Simulator] Driver at: ${lat}, ${lng} (${i + 1}/${routeCoordinates.length})`);

        // Nghỉ 2 giây giữa mỗi lần gửi GPS (giống thực tế)
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('[Simulator] Driver arrived at pickup point!');
    await channel.close();
    await connection.close();
}

// Lấy hằng số Exchange từ config nếu có thể, hoặc dùng string cứng
const EXCHANGES = { RIDE_EVENTS: 'ride.topic' };

simulate().catch(console.error);
