const { getChannel, getExchangeName, getRoutingKeys } = require('../config/rabbitmq');

/**
 * Publish ride.assigned event to RabbitMQ
 * @param {Object} data - { rideId, driverId, userId, pickup, drop, estimatedPrice, vehicleType }
 */
async function publishRideAssigned(data) {
    const channel = getChannel();

    if (!channel) {
        console.warn('[WARN] RabbitMQ not connected. Skipping event publish.');
        return false;
    }

    const event = {
        type: 'RideAssigned',
        rideId: data.rideId,
        driverId: data.driverId,
        driverLocation: data.driverLocation, // Added: To display driver's real starting position on map
        userId: data.userId,
        pickup: data.pickup,
        drop: data.drop,
        estimatedPrice: data.estimatedPrice,
        vehicleType: data.vehicleType,
        paymentMethod: data.paymentMethod || 'CASH',
        timestamp: new Date().toISOString()
    };

    try {
        const exchange = getExchangeName();
        const routingKey = getRoutingKeys().RIDE_ASSIGNED;

        channel.publish(
            exchange,
            routingKey,
            Buffer.from(JSON.stringify(event)),
            { persistent: true }
        );

        console.log(`✓ Published ride.assigned event: rideId=${event.rideId}, driverId=${event.driverId}`);
        return true;
    } catch (error) {
        console.error('Failed to publish ride.assigned event:', error);
        return false;
    }
}

/**
 * Publish ride.match_failed event to RabbitMQ
 * @param {Object} data - { rideId, userId, reason }
 */
async function publishRideMatchFailed(data) {
    const channel = getChannel();

    if (!channel) {
        console.warn('[WARN] RabbitMQ not connected. Skipping event publish.');
        return false;
    }

    const event = {
        type: 'RideMatchFailed',
        rideId: data.rideId,
        userId: data.userId,
        reason: data.reason || 'NO_DRIVER_AVAILABLE',
        timestamp: new Date().toISOString()
    };

    try {
        const exchange = getExchangeName();
        const routingKey = 'ride.match_failed';

        channel.publish(
            exchange,
            routingKey,
            Buffer.from(JSON.stringify(event)),
            { persistent: true }
        );

        console.log(`✓ Published ride.match_failed event: rideId=${event.rideId}, reason=${event.reason}`);
        return true;
    } catch (error) {
        console.error('Failed to publish ride.match_failed event:', error);
        return false;
    }
}

/**
 * Publish ride.rejected event to RabbitMQ (for timeouts)
 * @param {Object} data 
 */
async function publishRideRejected(data) {
    const channel = getChannel();

    if (!channel) {
        console.warn('[WARN] RabbitMQ not connected. Skipping event publish.');
        return false;
    }

    const event = {
        type: 'RideRejected',
        rideId: data.rideId,
        userId: data.userId,
        driverId: data.driverId,
        pickup: data.pickup,
        drop: data.drop,
        vehicleType: data.vehicleType,
        estimatedPrice: data.estimatedPrice,
        reason: data.reason || 'TIMEOUT',
        timestamp: new Date().toISOString()
    };

    try {
        const exchange = getExchangeName();
        // Fallback to literal if RIDE_REJECTED not explicitly in routing keys dict here
        const routingKeys = getRoutingKeys ? getRoutingKeys() : {};
        const routingKey = routingKeys.RIDE_REJECTED || 'ride.rejected';

        channel.publish(
            exchange,
            routingKey,
            Buffer.from(JSON.stringify(event)),
            { persistent: true }
        );

        console.log(`✓ Published ride.rejected event: rideId=${event.rideId}, driverId=${event.driverId}, reason=${event.reason}`);
        return true;
    } catch (error) {
        console.error('Failed to publish ride.rejected event:', error);
        return false;
    }
}

module.exports = { publishRideAssigned, publishRideMatchFailed, publishRideRejected };
