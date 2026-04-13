const { getChannel, getExchangeName, getRoutingKeys, connectRabbitMQ } = require('../config/rabbitmq');

/**
 * Publish ride.created event to RabbitMQ
 * @param {Object} booking - The booking document
 */
async function publishRideCreated(booking) {
    let channel = getChannel();

    if (!channel) {
        console.warn('[WARN] RabbitMQ channel not ready. Attempting to reconnect...');
        await connectRabbitMQ();
        channel = getChannel();
    }

    if (!channel) {
        console.error('[ERROR] RabbitMQ still unavailable. Event ride.created LOST.');
        return false;
    }

    const event = {
        type: 'RideCreated',
        bookingId: booking.bookingId, // Correlation ID
        rideId: booking.bookingId,    // Physical entity ID (initially same)
        userId: booking.userId,
        pickup: booking.pickup,
        drop: booking.drop,
        vehicleType: booking.vehicleType,
        paymentMethod: booking.paymentMethod || 'CASH',
        estimatedPrice: booking.estimatedPrice,
        estimatedDistance: booking.estimatedDistance,
        estimatedDuration: booking.tripEtaSeconds,
        timestamp: new Date().toISOString()
    };

    try {
        const exchange = getExchangeName();
        const routingKey = getRoutingKeys().RIDE_CREATED;

        channel.publish(
            exchange,
            routingKey,
            Buffer.from(JSON.stringify(event)),
            { persistent: true }
        );

        console.log(`✓ Published ride.created event for rideId: ${event.rideId}`);
        return true;
    } catch (error) {
        console.error('Failed to publish ride.created event:', error);
        return false;
    }
}

/**
 * Publish ride.cancelled event to RabbitMQ
 * @param {Object} data - { rideId, driverId, reason }
 */
async function publishRideCancelled(data) {
    const channel = getChannel();

    if (!channel) {
        console.warn('[WARN] RabbitMQ not connected. Skipping event publish.');
        return false;
    }

    const event = {
        type: 'RideCancelled',
        rideId: data.rideId,
        driverId: data.driverId,
        reason: data.reason || 'CUSTOMER_CANCELLED',
        timestamp: new Date().toISOString()
    };

    try {
        const exchange = getExchangeName();
        const routingKey = 'ride.cancelled';

        channel.publish(
            exchange,
            routingKey,
            Buffer.from(JSON.stringify(event)),
            { persistent: true }
        );

        console.log(`✓ Published ride.cancelled event for rideId: ${event.rideId}`);
        return true;
    } catch (error) {
        console.error('Failed to publish ride.cancelled event:', error);
        return false;
    }
}

module.exports = { publishRideCreated, publishRideCancelled };
