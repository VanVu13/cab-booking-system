const { getChannel, QUEUES } = require('../config/rabbitmq');
const { sendRideRequest, sendRideCancelled } = require('../websocket/wsHandler');
const { getUserProfile } = require('../services/userClient');

async function startConsuming() {
    const channel = getChannel();
    if (!channel) return;

    // 1. Consume ride.assigned
    channel.consume(QUEUES.RIDE_ASSIGNED, async (msg) => {
        if (!msg) return;

        try {
            const data = JSON.parse(msg.content.toString());
            console.log(`[EVENT] Received ride.assigned for driver ${data.driverId}`);

            // Fetch passenger details
            let passengerName = 'Khách hàng';
            let passengerPhone = '';
            let passengerAvatar = '';

            if (data.userId) {
                const userProfile = await getUserProfile(data.userId, 'CUSTOMER');
                if (userProfile) {
                    passengerName = userProfile.name || passengerName;
                    passengerPhone = userProfile.phone || passengerPhone;
                    passengerAvatar = userProfile.avatar || passengerAvatar;
                }
            }

            // Push to driver via WebSocket
            const pushed = sendRideRequest(data.driverId, {
                rideId: data.rideId,
                userId: data.userId,
                passengerName,
                passengerPhone,
                passengerAvatar,
                pickup: data.pickup || { address: 'Unknown' },
                drop: data.drop || { address: 'Unknown' },
                estimatedPrice: data.estimatedPrice,
                estimatedDistance: data.estimatedDistance,
                estimatedDuration: data.estimatedDuration,
                paymentMethod: data.paymentMethod || 'CASH',
                vehicleType: data.vehicleType || 'SEDAN'
            });

            if (pushed) {
                console.log(`[WS] ✓ Ride request pushed to driver ${data.driverId}`);
            } else {
                console.warn(`[WS] ✗ Driver ${data.driverId} not connected via WebSocket`);
                // In real scenario, might send SMS/Push notification or reject ride automatically
            }

            channel.ack(msg);
        } catch (error) {
            console.error('[EVENT] Error processing ride.assigned:', error.message);
            channel.nack(msg, false, false);
        }
    });

    // 2. Consume ride.cancelled
    channel.consume(QUEUES.RIDE_CANCELLED, (msg) => {
        if (!msg) return;

        try {
            const data = JSON.parse(msg.content.toString());
            console.log(`[EVENT] Received ride.cancelled for ride ${data.rideId}`);

            // Push to driver via WebSocket
            sendRideCancelled(data.driverId, data.rideId, data.reason);

            channel.ack(msg);
        } catch (error) {
            console.error('[EVENT] Error processing ride.cancelled:', error.message);
            channel.nack(msg, false, false);
        }
    });
}

module.exports = { startConsuming };
