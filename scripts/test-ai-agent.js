const amqp = require('amqplib');

async function testAIAgent() {
    console.log('🚀 Đang khởi tạo kịch bản kiểm tra AI Matching Agent...');
    
    try {
        const connection = await amqp.connect('amqp://localhost:5672');
        const channel = await connection.createChannel();
        const exchange = 'cab_events';

        await channel.assertExchange(exchange, 'topic', { durable: true });

        // Tạo một sự kiện ride.created giả lập
        const rideEvent = {
            rideId: `test-ride-${Date.now()}`,
            userId: 'user-test-001',
            pickup: {
                lat: 10.762622, // Quận 1, TP.HCM
                lng: 106.660172,
                address: 'Thành phố Hồ Chí Minh, Việt Nam'
            },
            drop: {
                lat: 10.773535,
                lng: 106.704159,
                address: 'Bitexco Financial Tower'
            },
            vehicleType: 'SEDAN',
            estimatedPrice: 50000
        };

        console.log('📡 Gửi sự kiện ride.created vào RabbitMQ...');
        channel.publish(exchange, 'ride.created', Buffer.from(JSON.stringify(rideEvent)));

        console.log('\n✅ ĐÃ GỬI THÀNH CÔNG!');
        console.log('--------------------------------------------------');
        console.log('BÂY GIỜ BẠN HÃY KIỂM TRA LOG CỦA [AI-MATCHING-SERVICE]');
        console.log('Tìm các dòng log sau:');
        console.log('1. [AGENT-TOOLS] Enriching data...');
        console.log('2. [MATCHING] Selected driver: ... (score: ...)');
        console.log('--------------------------------------------------');

        setTimeout(() => {
            connection.close();
            process.exit(0);
        }, 2000);

    } catch (error) {
        console.error('❌ Lỗi khi test:', error.message);
        process.exit(1);
    }
}

testAIAgent();
