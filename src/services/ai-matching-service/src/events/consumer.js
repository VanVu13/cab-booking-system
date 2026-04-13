const { getChannel, getQueueName, getExchangeName } = require('../config/rabbitmq');
const { findNearbyDrivers, selectBestDriver, validateContext } = require('../services/driverClient');
const { publishRideAssigned, publishRideMatchFailed, publishRideRejected } = require('./producer');
const { getBooking } = require('../services/bookingClient');
const { logContextMissing, logMatchFailed } = require('../services/decisionLogger');

// In-memory set to keep track of cancelled rides while matching is in progress
const cancelledRides = new Set();

// Map to keep track of all drivers who rejected a specific ride to prevent infinite loops
const rejectedDriversByRide = new Map();

/**
 * Start consuming ride.created events
 */
async function startConsuming() {
    const channel = getChannel();

    if (!channel) {
        console.warn('[WARN] RabbitMQ not connected. Skipping consumer setup.');
        return;
    }

    const queue = getQueueName();
    const exchange = getExchangeName();

    // Concurrency: process up to 10 messages in parallel
    channel.prefetch(10);

    // Bind to relevant events
    await channel.bindQueue(queue, exchange, 'ride.created');
    await channel.bindQueue(queue, exchange, 'ride.rejected');
    await channel.bindQueue(queue, exchange, 'ride.cancelled');

    console.log(`✓ Waiting for events (ride.created, ride.rejected, ride.cancelled) in queue: ${queue}`);

    channel.consume(queue, async (msg) => {
        if (msg === null) return;

        try {
            const event = JSON.parse(msg.content.toString());
            const routingKey = msg.fields.routingKey;

            console.log(`\n========== RECEIVED ${routingKey} ==========`);
            console.log(`rideId: ${event.rideId}`);

            if (routingKey === 'ride.created') {
                await handleRideCreated(event);
            } else if (routingKey === 'ride.rejected') {
                await handleRideRejected(event);
            } else if (routingKey === 'ride.cancelled') {
                console.log(`[MATCHING] Ride ${event.rideId} cancelled by customer. Adding to blacklist.`);
                cancelledRides.add(event.rideId);
            }
            console.log(`============================================\n`);

            // Acknowledge message
            channel.ack(msg);
        } catch (error) {
            console.error('Error processing ride.created event:', error);
            // Negative acknowledge - don't requeue to avoid infinite loop on bad messages
            channel.nack(msg, false, false);
        }
    });
}

/**
 * Handle ride.created event
 * Find nearby drivers and assign the best one
 */
async function handleRideCreated(event) {
    const { rideId, userId, pickup, vehicleType } = event;

    // Context validation - check for missing data
    const missingFields = validateContext(event);
    if (missingFields.length > 0) {
        logContextMissing(rideId, missingFields);
        if (missingFields.includes('pickup') || missingFields.includes('pickup.coordinates')) {
            console.warn(`[MATCHING] Critical context missing for ride ${rideId}. Cannot match.`);
            await publishRideMatchFailed({ rideId, userId: userId || 'unknown', reason: 'CONTEXT_MISSING' });
            return;
        }
    }

    // Initialize rejected drivers list for this ride
    rejectedDriversByRide.set(rideId, new Set());

    // Set a TTL to clean up memory after 15 minutes
    setTimeout(() => {
        cancelledRides.delete(rideId);
        rejectedDriversByRide.delete(rideId);
    }, 15 * 60 * 1000);

    // 1. Find nearby drivers with exponential backoff
    let drivers = [];
    const maxRetries = 6;
    const baseDelay = 2000; // Start at 2s, exponential: 2, 4, 8, 16, 32s

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (cancelledRides.has(rideId)) {
            console.log(`[MATCHING] Ride ${rideId} was cancelled during matching. Aborting.`);
            cancelledRides.delete(rideId);
            return;
        }

        try {
            // Gradually expand search radius each attempt
            const baseRadius = 5000;
            const radius = baseRadius + ((attempt - 1) * 2000);

            console.log(`[MATCHING] Attempt ${attempt}/${maxRetries} to find drivers near (${pickup.lat}, ${pickup.lng}) radius ${radius}m...`);
            drivers = await findNearbyDrivers(pickup, vehicleType || 'SEDAN', radius);
            if (drivers.length > 0) {
                console.log(`[MATCHING] Found ${drivers.length} nearby drivers`);
                break;
            } else {
                console.log(`[MATCHING] No drivers found yet. Waiting ${retryDelayMs / 1000}s...`);
            }
        } catch (error) {
            console.error(`[MATCHING] Error finding drivers on attempt ${attempt}:`, error.message);
        }

        if (attempt < maxRetries) {
            const delay = Math.min(baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000, 30000);
            console.log(`[MATCHING] Retrying in ${Math.round(delay)}ms (exponential backoff)...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    if (drivers.length === 0) {
        console.warn(`[MATCHING] No drivers available for ride ${rideId} after retries`);
        // Publish match failed event
        await publishRideMatchFailed({
            rideId,
            userId,
            reason: 'NO_DRIVER_AVAILABLE'
        });
        return;
    }

    // 2. Select best driver (now uses multi-factor ranking with decision logging)
    const selectedDriver = selectBestDriver(drivers, { rideId });
    if (!selectedDriver) {
        logMatchFailed(rideId, 'SCORING_FAILED');
        await publishRideMatchFailed({ rideId, userId, reason: 'SCORING_FAILED' });
        return;
    }
    console.log(`[MATCHING] Selected driver: ${selectedDriver.driverId} (score: ${selectedDriver.score?.toFixed(3)}, distance: ${selectedDriver.distanceMeters}m, rating: ${selectedDriver.rating})`);

    // Prepare driver location safely
    const driverLocation = selectedDriver.location || (selectedDriver.lat && selectedDriver.lng ? { lat: selectedDriver.lat, lng: selectedDriver.lng } : null);

    // 3. Publish ride.assigned event (include full ride data for downstream consumers)
    await publishRideAssigned({
        bookingId: event.bookingId || event.rideId, // Pass through booking reference
        rideId,
        driverId: selectedDriver.driverId,
        driverLocation, // Fixed: Use normalized location object
        userId,
        pickup,
        drop: event.drop,
        estimatedPrice: event.estimatedPrice,
        estimatedDistance: event.estimatedDistance,
        estimatedDuration: event.estimatedDuration,
        vehicleType: vehicleType || 'SEDAN',
        paymentMethod: event.paymentMethod || 'CASH'
    });

    const locStr = driverLocation ? `at (${driverLocation.lat}, ${driverLocation.lng})` : 'without location';
    console.log(`[MATCHING] ✓ Ride ${rideId} assigned to driver ${selectedDriver.driverId} ${locStr}`);

    // 4. Setup Timeout Check (32 seconds)
    setTimeout(async () => {
        try {
            const bookingId = event.bookingId || rideId;
            const booking = await getBooking(bookingId);
            // If booking is still PROPOSED and for THIS driver, they haven't accepted. Trigger a timeout.
            if (booking && booking.status === 'PROPOSED' && booking.provisionalDriverId === selectedDriver.driverId) {
                console.log(`[MATCHING] Driver ${selectedDriver.driverId} timed out for ride ${rideId}`);
                await publishRideRejected({
                    rideId: rideId,
                    userId: userId,
                    driverId: selectedDriver.driverId,
                    pickup: pickup,
                    drop: event.drop,
                    vehicleType: vehicleType,
                    estimatedPrice: event.estimatedPrice,
                    estimatedDistance: event.estimatedDistance,
                    estimatedDuration: event.estimatedDuration,
                    reason: 'TIMEOUT'
                });
            }
        } catch (err) {
            console.error('[MATCHING] Timeout check failed:', err.message);
        }
    }, 32000);
}

/**
 * Handle ride.rejected event
 * Retry matching for the ride, excluding the driver who rejected
 */
async function handleRideRejected(event) {
    const { rideId, driverId, userId, pickup, drop } = event;
    console.log(`[MATCHING] Ride ${rideId} rejected by driver ${driverId}. Retrying...`);

    if (!pickup || !userId) {
        console.warn(`[MATCHING] ride.rejected missing pickup/userId data, cannot re-match ride ${rideId}`);
        await publishRideMatchFailed({ rideId, userId: userId || 'unknown', reason: 'TIMEOUT' });
        return;
    }

    // Find nearby drivers with retries, excluding the one who rejected
    let drivers = [];
    const maxRetries = 6; // 30 seconds timeout
    const retryDelayMs = 5000;

    if (!rejectedDriversByRide.has(rideId)) {
        rejectedDriversByRide.set(rideId, new Set());
        // Set TTL just in case handleRideCreated didn't
        setTimeout(() => {
            cancelledRides.delete(rideId);
            rejectedDriversByRide.delete(rideId);
        }, 15 * 60 * 1000);
    }
    rejectedDriversByRide.get(rideId).add(driverId);
    let excludedDrivers = rejectedDriversByRide.get(rideId);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (cancelledRides.has(rideId)) {
            console.log(`[MATCHING] Ride ${rideId} was cancelled during matching. Aborting.`);
            cancelledRides.delete(rideId); // Clean up
            return;
        }

        try {
            // Gradually expand search radius each attempt to find drivers further away
            const baseRadius = 5000;
            const radius = baseRadius + ((attempt - 1) * 2000);

            console.log(`[MATCHING] Retry Attempt ${attempt}/${maxRetries} to find drivers (radius ${radius}m)...`);
            let foundDrivers = await findNearbyDrivers(pickup, event.vehicleType || 'SEDAN', radius);
            drivers = foundDrivers.filter(d => !excludedDrivers.has(d.driverId));

            if (drivers.length > 0) {
                console.log(`[MATCHING] Found ${drivers.length} drivers (excluding rejected ones)`);
                break;
            } else {
                console.log(`[MATCHING] No other drivers found yet. Waiting ${retryDelayMs / 1000}s...`);
            }
        } catch (error) {
            console.error(`[MATCHING] Failed to find drivers on retry attempt ${attempt}:`, error.message);
        }

        if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }
    }

    if (drivers.length === 0) {
        console.warn(`[MATCHING] No other drivers for ride ${rideId} after retries`);
        await publishRideMatchFailed({ rideId, userId, reason: 'NO_DRIVER_AVAILABLE' });
        return;
    }

    const selectedDriver = selectBestDriver(drivers);
    console.log(`[MATCHING] Re-assigned to driver: ${selectedDriver.driverId}`);

    await publishRideAssigned({
        rideId,
        driverId: selectedDriver.driverId,
        userId,
        pickup,
        drop,
        estimatedPrice: event.estimatedPrice,
        estimatedDistance: event.estimatedDistance,
        estimatedDuration: event.estimatedDuration,
        vehicleType: event.vehicleType || 'SEDAN',
        paymentMethod: event.paymentMethod || 'CASH'
    });

    console.log(`[MATCHING] ✓ Ride ${rideId} re-assigned to driver ${selectedDriver.driverId}`);

    // Setup Timeout Check (32 seconds) for the retried driver
    setTimeout(async () => {
        try {
            const bookingId = event.bookingId || rideId;
            const booking = await getBooking(bookingId);
            if (booking && booking.status === 'PROPOSED' && booking.provisionalDriverId === selectedDriver.driverId) {
                console.log(`[MATCHING] Driver ${selectedDriver.driverId} timed out for ride ${rideId}`);
                await publishRideRejected({
                    rideId: rideId,
                    userId: userId,
                    driverId: selectedDriver.driverId,
                    pickup: pickup,
                    drop: event.drop,
                    vehicleType: event.vehicleType || 'SEDAN',
                    paymentMethod: event.paymentMethod || 'CASH',
                    estimatedPrice: event.estimatedPrice,
                    estimatedDistance: event.estimatedDistance,
                    estimatedDuration: event.estimatedDuration,
                    reason: 'TIMEOUT'
                });
            }
        } catch (err) {
            console.error('[MATCHING] Timeout check failed:', err.message);
        }
    }, 32000);
}

module.exports = { startConsuming };
