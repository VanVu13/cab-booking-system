const { getChannel, getQueueName, getExchangeName } = require('../config/rabbitmq');
const Ride = require('../models/Ride');

/**
 * Start consuming ride.assigned events from RabbitMQ
 * When a ride is assigned by AI Matching, create a Ride record
 */
async function startConsuming() {
    const channel = getChannel();

    if (!channel) {
        console.warn('[WARN] RabbitMQ not connected. Skipping consumer setup.');
        return;
    }

    const queue = getQueueName();
    const exchange = getExchangeName();

    // Bind to relevant events
    await channel.bindQueue(queue, exchange, 'ride.assigned');
    await channel.bindQueue(queue, exchange, 'ride.accepted');
    await channel.bindQueue(queue, exchange, 'ride.arrived');
    await channel.bindQueue(queue, exchange, 'ride.started');
    await channel.bindQueue(queue, exchange, 'ride.completed');
    await channel.bindQueue(queue, exchange, 'ride.rejected');
    await channel.bindQueue(queue, exchange, 'ride.match_failed');

    console.log(`✓ Waiting for ride events in queue: ${queue}`);

    channel.consume(queue, async (msg) => {
        if (msg === null) return;

        try {
            const event = JSON.parse(msg.content.toString());
            const routingKey = msg.fields.routingKey;

            console.log(`\n[RIDE] Received ${routingKey}:`, JSON.stringify(event, null, 2));

            if (routingKey === 'ride.assigned') {
                await handleRideAssigned(event);
            } else if (routingKey === 'ride.accepted') {
                await handleStatusUpdate(event, 'ASSIGNED');
            } else if (routingKey === 'ride.arrived') {
                await handleStatusUpdate(event, 'ARRIVED');
            } else if (routingKey === 'ride.started') {
                await handleStatusUpdate(event, 'IN_PROGRESS');
            } else if (routingKey === 'ride.completed') {
                await handleStatusUpdate(event, 'COMPLETED');
            } else if (routingKey === 'ride.rejected' || routingKey === 'ride.match_failed') {
                await handleRideCancelled(event);
            } else {
                console.warn(`[RIDE] No handler for event: ${routingKey}`);
            }

            channel.ack(msg);
        } catch (error) {
            console.error('[RIDE] Error processing event:', error);
            channel.nack(msg, false, true);
        }
    });
}

/**
 * Handle ride.assigned event
 * Create a new Ride record with status ASSIGNED
 */
async function handleRideAssigned(event) {
    const { rideId, driverId, userId, pickup, drop, estimatedPrice, vehicleType } = event;

    // Check if ride already exists (idempotency/re-assignment)
    let existingRide = await Ride.findOne({ rideId });
    if (existingRide) {
        if (existingRide.status === 'PROPOSED' && existingRide.driverId === driverId) {
            console.log(`[RIDE] Ride ${rideId} already exists and proposed to same driver, skipping. Status: ${existingRide.status}`);
            return;
        }
        console.log(`[RIDE] Ride ${rideId} exists, updating for new assignment. Old Status: ${existingRide.status}`);
        existingRide.driverId = driverId;
        existingRide.status = 'PROPOSED';
        existingRide.updatedAt = new Date();
        await existingRide.save();
        return;
    }

    console.log(`[RIDE] Creating new ride record for ${rideId}`);
    console.log(`  - Driver: ${driverId}`);
    console.log(`  - User: ${userId}`);
    console.log(`  - Pickup: ${pickup?.address || JSON.stringify(pickup)}`);

    const ride = new Ride({
        rideId,
        bookingId: event.bookingId || rideId, // Critical Sync: reference back to booking
        userId,
        driverId,
        pickup,
        drop,
        estimatedPrice,
        vehicleType: vehicleType || 'SEDAN',
        paymentMethod: event.paymentMethod || 'CASH',
        status: 'PROPOSED'
    });

    try {
        await ride.save();
        console.log(`✓ Ride ${rideId} created successfully for Booking ${ride.bookingId}`);
    } catch (saveError) {
        console.error(`[RIDE] Failed to save ride ${rideId}:`, saveError.message);
        throw saveError; // Re-throw to trigger NACK and retry
    }
}

/**
 * Handle ride.rejected or ride.match_failed
 * Clean up local record if ride is not started yet
 */
async function handleRideCancelled(event) {
    const { rideId } = event;
    console.log(`[RIDE] Cleaning up ride ${rideId} due to rejection/match_failure`);

    try {
        const ride = await Ride.findOne({ rideId });
        if (!ride) return;

        // Only delete/cancel if not started yet
        if (['ASSIGNED', 'SEARCHING_DRIVER', 'PROPOSED'].includes(ride.status)) {
            await Ride.deleteOne({ rideId });
            console.log(`✓ Ride ${rideId} removed from Ride Service (Assignment revoked)`);
        } else {
            console.log(`[RIDE] Ride ${rideId} already in status ${ride.status}, skipping removal.`);
        }
    } catch (error) {
        console.error(`[RIDE] Failed to clean up ride ${rideId}:`, error.message);
    }
}

/**
 * Handle general status updates
 */
async function handleStatusUpdate(event, newStatus) {
    const { rideId } = event;
    console.log(`[RIDE] Updating ride ${rideId} status to ${newStatus}`);

    try {
        const ride = await Ride.findOne({ rideId });
        if (!ride) {
            console.warn(`[RIDE] Ride ${rideId} not found for status update to ${newStatus}`);
            return;
        }

        ride.status = newStatus;
        await ride.save();
        console.log(`✓ Ride ${rideId} → ${newStatus}`);
    } catch (error) {
        console.error(`[RIDE] Failed to update ride ${rideId} to ${newStatus}:`, error.message);
    }
}

module.exports = { startConsuming };
