const { getChannel, EXCHANGES } = require('../config/rabbitmq');

async function publishRideResponse(rideId, driverId, action, userId) {
    const channel = getChannel();
    if (!channel) return;

    const normalizedAction = action ? action.toUpperCase() : '';
    const isAccepted = normalizedAction === 'ACCEPT' || normalizedAction === 'ACCEPTED';
    const eventType = isAccepted ? 'ride.accepted' : 'ride.rejected';
    const routingKey = eventType;

    const payload = {
        rideId,
        driverId,
        userId, // Added: Crucial for Notification Service to find the customer
        action, // ACCEPT | REJECT
        timestamp: new Date().toISOString()
    };

    channel.publish(
        EXCHANGES.RIDE_EVENTS,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true }
    );

    console.log(`[EVENT] Published ${eventType} for ride ${rideId} by driver ${driverId}`);
}

async function publishLocationUpdated(driverId, lat, lng) {
    const channel = getChannel();
    if (!channel) return;

    const payload = {
        driverId,
        lat,
        lng,
        timestamp: new Date().toISOString()
    };

    // Optional: Broadly inform other services about driver location
    channel.publish(
        EXCHANGES.RIDE_EVENTS,
        'driver.location_updated',
        Buffer.from(JSON.stringify(payload))
    );
}

module.exports = {
    publishRideResponse,
    publishLocationUpdated
};
