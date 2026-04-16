const { getChannel, getQueueName, getRoutingKeys } = require('../config/rabbitmq');
const { createNotification } = require('../services/notificationService');

async function startConsuming() {
    const channel = getChannel();
    if (!channel) {
        console.warn('[WARN] RabbitMQ not connected. Skipping consumer setup.');
        return;
    }

    const queue = getQueueName();
    const ROUTING_KEYS = getRoutingKeys();

    console.log(`✓ Waiting for events in queue: ${queue}`);

    channel.consume(queue, async (msg) => {
        if (msg === null) return;

        console.log('DEBUG: Consumer received raw message'); // Add this log
        try {
            const eventData = JSON.parse(msg.content.toString());
            const routingKey = msg.fields.routingKey;

            console.log(`\n[NOTIFICATION] Received ${routingKey}`);

            // Map routing key to internal event type
            let type = null;
            if (routingKey === ROUTING_KEYS.RIDE_ASSIGNED) type = 'ride.assigned';
            else if (routingKey === ROUTING_KEYS.RIDE_ACCEPTED) type = 'ride.accepted';
            else if (routingKey === 'ride.arrived') type = 'ride.arrived'; // Added
            else if (routingKey === ROUTING_KEYS.RIDE_REJECTED) type = 'ride.rejected';
            else if (routingKey === ROUTING_KEYS.RIDE_CANCELLED) type = 'ride.cancelled';
            else if (routingKey === ROUTING_KEYS.RIDE_STARTED) type = 'ride.started';
            else if (routingKey === ROUTING_KEYS.RIDE_COMPLETED) type = 'ride.completed';
            else if (routingKey === ROUTING_KEYS.RIDE_MATCH_FAILED) type = 'ride.match_failed';
            else if (routingKey === ROUTING_KEYS.PAYMENT_COMPLETED) type = 'payment.completed';
            else if (routingKey === ROUTING_KEYS.PAYMENT_FAILED) type = 'payment.failed';
            else if (routingKey === 'driver.location_updated') type = 'driver.location_updated'; // Manual check if not in routing keys const yet

            if (type) {
                const { broadcastToRoom } = require('../websocket/wsHandler');

                // Fast-path for location updates: Don't save to DB, just broadcast
                if (type === 'driver.location_updated') {
                    // Broadcast to any client subscribed to this driver (Customer App)
                    broadcastToRoom(`driver:${eventData.driverId}`, 'ride:driver_location', eventData);
                }

                // General status updates for tracking screen
                else if (type.startsWith('ride.')) {
                    // Do not create a persistent notification about driver rejection, this is an internal retry mechanism
                    if (type === 'ride.rejected') {
                        console.log('[NOTIFICATION] Suppressing RIDE_REJECTED notification, but notifying client to SEARCHING_DRIVER');
                        broadcastToRoom(eventData.userId, 'ride:status_update', {
                            rideId: eventData.rideId || eventData.bookingId || eventData.id,
                            status: 'SEARCHING_DRIVER',
                            payload: eventData
                        });
                    } else {
                        // ENRICHMENT: Fetch Driver Profile for Accepted/Assigned/Arrived/Started events
                        if (['ride.accepted', 'ride.assigned', 'ride.arrived', 'ride.started'].includes(type) && eventData.driverId) {
                            try {
                                const { getUserProfile } = require('../services/userClient');
                                const { getDriverRating } = require('../services/reviewClient');
                                const [driverProfile, ratingInfo] = await Promise.all([
                                    getUserProfile(eventData.driverId, 'DRIVER'),
                                    getDriverRating(eventData.driverId)
                                ]);
                                if (driverProfile) {
                                    eventData.driverName = driverProfile.name;
                                    eventData.driverPhone = driverProfile.phone;
                                    eventData.driverAvatar = driverProfile.avatar;
                                    eventData.driverRating = ratingInfo; // real rating from review service
                                    eventData.vehicle = driverProfile.vehicleDetails; // Enrichment
                                    console.log('[NOTIFICATION] Enriched event with driver details');
                                }
                            } catch (err) {
                                console.warn('[NOTIFICATION] Failed to enrich driver details:', err.message);
                            }
                        }

                        // Use explicit status from payload if available, otherwise derive from routing key
                        // Normalize TERMINOLOGY: 'assigned' from AI Matching should be 'PROPOSED' for UI/Customer (awaiting acceptance)
                        let derivedStatus = eventData.status;
                        if (!derivedStatus) {
                            const suffix = type.split('.')[1].toUpperCase();
                            derivedStatus = suffix === 'ASSIGNED' ? 'PROPOSED' : suffix;
                        }

                        // Normalize STARTED -> IN_PROGRESS for consistency across apps
                        if (derivedStatus === 'STARTED') derivedStatus = 'IN_PROGRESS';

                        // Prepare the update payload
                        const statusUpdatePayload = {
                            rideId: eventData.rideId || eventData.bookingId || eventData.id,
                            status: derivedStatus,
                            payload: eventData
                        };

                        // 1. Notify the Customer (userId)
                        if (eventData.userId) {
                            broadcastToRoom(eventData.userId, 'ride:status_update', statusUpdatePayload);
                        }

                        // 2. Notify the Driver (driverId) - essential for cancellations and started rides
                        if (eventData.driverId) {
                            broadcastToRoom(eventData.driverId, 'ride:status_update', statusUpdatePayload);
                        }

                        // Specific handling for driver match (initializes tracking map and driver info for customer)
                        if (type === 'ride.assigned') {
                            broadcastToRoom(eventData.userId, 'booking:driver_matched', eventData);
                        }

                        await createNotification(type, eventData);
                    }
                }
                else {
                    await createNotification(type, eventData);
                }
            } else {
                console.warn(`[NOTIFICATION] Unknown routing key: ${routingKey}`);
            }

            channel.ack(msg);
        } catch (error) {
            console.error('[NOTIFICATION] Error processing event:', error);
            // In a real production app, we might dead-letter this
            channel.nack(msg, false, false); // Don't requeue to avoid infinite loop for bad messages
        }
    });
}

module.exports = { startConsuming };
