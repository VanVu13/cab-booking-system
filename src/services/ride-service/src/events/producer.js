const { getChannel, getExchangeName, getRoutingKeys } = require('../config/rabbitmq');

/**
 * Publish ride.arrived event to RabbitMQ
 * @param {Object} data - { rideId, driverId, userId }
 */
async function publishRideArrived(data) {
    const channel = getChannel();

    if (!channel) {
        console.warn('[WARN] RabbitMQ not connected. Skipping event publish.');
        return false;
    }

    const event = {
        type: 'RideArrived',
        rideId: data.rideId,
        userId: data.userId,
        driverId: data.driverId,
        timestamp: new Date().toISOString()
    };

    try {
        const exchange = getExchangeName();
        const routingKey = getRoutingKeys().RIDE_ARRIVED;

        channel.publish(
            exchange,
            routingKey,
            Buffer.from(JSON.stringify(event)),
            { persistent: true }
        );

        console.log(`✓ Published ride.arrived event for rideId: ${event.rideId}`);
        return true;
    } catch (error) {
        console.error('Failed to publish ride.arrived event:', error);
        return false;
    }
}

/**
 * Publish ride.started event to RabbitMQ
 * @param {Object} data - { rideId, driverId, startedAt }
 */
async function publishRideStarted(data) {
    const channel = getChannel();

    if (!channel) {
        console.warn('[WARN] RabbitMQ not connected. Skipping event publish.');
        return false;
    }

    const event = {
        type: 'RideStarted',
        rideId: data.rideId,
        userId: data.userId, // Added: To notify the specific user
        driverId: data.driverId,
        status: 'IN_PROGRESS', // Explicit status for downstream consumers (tracking, notification)
        startedAt: data.startedAt || new Date().toISOString(),
        timestamp: new Date().toISOString()
    };

    try {
        const exchange = getExchangeName();
        const routingKey = getRoutingKeys().RIDE_STARTED;

        channel.publish(
            exchange,
            routingKey,
            Buffer.from(JSON.stringify(event)),
            { persistent: true }
        );

        console.log(`✓ Published ride.started event for rideId: ${event.rideId}`);
        return true;
    } catch (error) {
        console.error('Failed to publish ride.started event:', error);
        return false;
    }
}

/**
 * Publish ride.completed event to RabbitMQ
 * @param {Object} data - { rideId, finalPrice, distanceMeters, durationSeconds, completedAt }
 */
async function publishRideCompleted(data) {
    const channel = getChannel();

    if (!channel) {
        console.warn('[WARN] RabbitMQ not connected. Skipping event publish.');
        return false;
    }

    const event = {
        type: 'RideCompleted',
        rideId: data.rideId,
        userId: data.userId,
        driverId: data.driverId,
        finalPrice: data.finalPrice,
        distanceMeters: data.distanceMeters,
        durationSeconds: data.durationSeconds,
        completedAt: data.completedAt || new Date().toISOString(),
        timestamp: new Date().toISOString()
    };

    try {
        const exchange = getExchangeName();
        const routingKey = getRoutingKeys().RIDE_COMPLETED;

        channel.publish(
            exchange,
            routingKey,
            Buffer.from(JSON.stringify(event)),
            { persistent: true }
        );

        console.log(`✓ Published ride.completed event for rideId: ${event.rideId}`);
        return true;
    } catch (error) {
        console.error('Failed to publish ride.completed event:', error);
        return false;
    }
}

/**
 * Publish ride.accepted event to RabbitMQ
 * @param {Object} data - { rideId, driverId, userId }
 */
async function publishRideAccepted(data) {
    const channel = getChannel();

    if (!channel) {
        console.warn('[WARN] RabbitMQ not connected. Skipping event publish.');
        return false;
    }

    const event = {
        type: 'RideAccepted',
        rideId: data.rideId,
        userId: data.userId,
        driverId: data.driverId,
        action: 'ACCEPTED',
        timestamp: new Date().toISOString()
    };

    try {
        const exchange = getExchangeName();
        // Fallback to strict string if routing keys map is missing this key
        const routingKey = getRoutingKeys().RIDE_ACCEPTED || 'ride.accepted';

        channel.publish(
            exchange,
            routingKey,
            Buffer.from(JSON.stringify(event)),
            { persistent: true }
        );

        console.log(`✓ Published ride.accepted event for rideId: ${event.rideId}`);
        return true;
    } catch (error) {
        console.error('Failed to publish ride.accepted event:', error);
        return false;
    }
}

/**
 * Publish ride.rejected event to RabbitMQ
 * @param {Object} data - { rideId, driverId, userId, reason }
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
        reason: data.reason || 'Driver rejected',
        action: 'REJECTED',
        pickup: data.pickup,
        drop: data.drop,
        vehicleType: data.vehicleType,
        estimatedPrice: data.estimatedPrice,
        timestamp: new Date().toISOString()
    };

    try {
        const exchange = getExchangeName();
        const routingKey = getRoutingKeys().RIDE_REJECTED || 'ride.rejected';

        channel.publish(
            exchange,
            routingKey,
            Buffer.from(JSON.stringify(event)),
            { persistent: true }
        );

        console.log(`✓ Published ride.rejected event for rideId: ${event.rideId}`);
        return true;
    } catch (error) {
        console.error('Failed to publish ride.rejected event:', error);
        return false;
    }
}

module.exports = {
    publishRideArrived,
    publishRideStarted,
    publishRideCompleted,
    publishRideAccepted,
    publishRideRejected
};
