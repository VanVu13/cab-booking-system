const { getChannel, getQueueName, getExchangeName } = require('../config/rabbitmq');
const Booking = require('../models/Booking');

/**
 * Event handlers mapping
 */
const EVENT_HANDLERS = {
    'ride.assigned': handleRideAssigned,
    'ride.arrived': handleRideArrived,
    'ride.accepted': handleRideAccepted,
    'ride.rejected': handleRideRejected,
    'ride.started': handleRideStarted,
    'ride.completed': handleRideCompleted,
    'ride.match_failed': handleRideMatchFailed,
    'payment.completed': handlePaymentCompleted,
    'payment.failed': handlePaymentFailed
};

/**
 * Start consuming events from RabbitMQ
 */
async function startConsuming() {
    const channel = getChannel();

    if (!channel) {
        console.warn('[WARN] RabbitMQ not connected. Skipping consumer setup.');
        return;
    }

    const queue = getQueueName();
    const exchange = getExchangeName();

    // Bind to all relevant events
    const eventsToConsume = [
        'ride.assigned',
        'ride.arrived',
        'ride.accepted',
        'ride.rejected',
        'ride.started',
        'ride.completed',
        'ride.match_failed',
        'payment.completed',
        'payment.failed'
    ];

    for (const routingKey of eventsToConsume) {
        await channel.bindQueue(queue, exchange, routingKey);
        console.log(`✓ Bound queue to ${routingKey}`);
    }

    console.log(`✓ Waiting for events in queue: ${queue}`);

    channel.consume(queue, async (msg) => {
        if (msg === null) return;

        try {
            const event = JSON.parse(msg.content.toString());
            const routingKey = msg.fields.routingKey;

            console.log(`\n[BOOKING] Received ${routingKey}:`, JSON.stringify(event, null, 2));

            const handler = EVENT_HANDLERS[routingKey];
            if (handler) {
                await handler(event);
            } else {
                console.warn(`[BOOKING] No handler for event: ${routingKey}`);
            }

            channel.ack(msg);
        } catch (error) {
            console.error('[BOOKING] Error processing event:', error);
            channel.nack(msg, false, true);
        }
    });
}

/**
 * Handle ride.assigned event
 * Update booking status to PROPOSED
 */
async function handleRideAssigned(event) {
    const { rideId, driverId } = event;

    const booking = await Booking.findOne({ bookingId: rideId });
    if (!booking) return;

    booking.status = 'PROPOSED';
    booking.provisionalDriverId = driverId;
    await booking.save();

    console.log(`✓ Booking ${booking.bookingId} → PROPOSED (candidate: ${driverId})`);
}

/**
 * Handle ride.arrived event
 * Update booking status to ARRIVED
 */
async function handleRideArrived(event) {
    const { rideId } = event;

    const booking = await Booking.findOne({ bookingId: rideId });
    if (!booking) return;

    booking.status = 'ARRIVED';
    await booking.save();

    console.log(`✓ Booking ${booking.bookingId} → ARRIVED`);
}

/**
 * Handle ride.accepted event
 * Update booking status to DRIVER_ASSIGNED
 */
async function handleRideAccepted(event) {
    const { rideId, driverId } = event;

    const booking = await Booking.findOne({ bookingId: rideId });
    if (!booking) return;

    booking.status = 'DRIVER_ASSIGNED';
    booking.driverId = driverId;
    booking.provisionalDriverId = null;
    await booking.save();

    console.log(`✓ Booking ${booking.bookingId} → DRIVER_ASSIGNED (driver: ${driverId})`);
}

/**
 * Handle ride.rejected event
 * Update booking status back to SEARCHING_DRIVER
 */
async function handleRideRejected(event) {
    const { rideId } = event;

    const booking = await Booking.findOne({ bookingId: rideId });
    if (!booking) return;

    booking.status = 'SEARCHING_DRIVER';
    booking.provisionalDriverId = null;
    booking.driverId = null; // Also clear driverId in case of cancellation after assignment
    await booking.save();

    console.log(`✓ Booking ${booking.bookingId} → back to SEARCHING_DRIVER (rejected)`);
}

/**
 * Handle ride.started event
 * Update booking status to IN_PROGRESS
 */
async function handleRideStarted(event) {
    const { rideId } = event;

    const booking = await Booking.findOne({ bookingId: rideId });
    if (!booking) {
        console.warn(`[BOOKING] Booking not found for rideId: ${rideId}`);
        return;
    }

    booking.status = 'IN_PROGRESS';
    await booking.save();

    console.log(`✓ Booking ${booking.bookingId} → IN_PROGRESS`);
}

/**
 * Handle ride.completed event
 * Update booking status to COMPLETED
 */
async function handleRideCompleted(event) {
    const { rideId, finalPrice } = event;

    const booking = await Booking.findOne({ bookingId: rideId });
    if (!booking) {
        console.warn(`[BOOKING] Booking not found for rideId: ${rideId}`);
        return;
    }

    booking.status = 'COMPLETED';
    if (finalPrice) {
        booking.finalPrice = finalPrice;
    }
    await booking.save();

    console.log(`✓ Booking ${booking.bookingId} → COMPLETED`);
}

/**
 * Handle ride.match_failed event
 * Update booking status to MATCH_FAILED
 */
async function handleRideMatchFailed(event) {
    const { rideId, reason } = event;

    const booking = await Booking.findOne({ bookingId: rideId });
    if (!booking) {
        console.warn(`[BOOKING] Booking not found for rideId: ${rideId}`);
        return;
    }

    booking.status = 'MATCH_FAILED';
    await booking.save();

    console.log(`✓ Booking ${booking.bookingId} → MATCH_FAILED (reason: ${reason})`);
}

/**
 * Handle payment.completed event
 * Update booking paymentStatus to PAID
 */
async function handlePaymentCompleted(event) {
    const { rideId } = event;

    const booking = await Booking.findOne({ bookingId: rideId });
    if (!booking) {
        console.warn(`[BOOKING] Booking not found for rideId: ${rideId}`);
        return;
    }

    booking.paymentStatus = 'PAID';
    await booking.save();

    console.log(`✓ Booking ${booking.bookingId} → paymentStatus: PAID`);
}

/**
 * Handle payment.failed event
 * Update booking paymentStatus to FAILED
 */
async function handlePaymentFailed(event) {
    const { rideId, reason } = event;

    const booking = await Booking.findOne({ bookingId: rideId });
    if (!booking) {
        console.warn(`[BOOKING] Booking not found for rideId: ${rideId}`);
        return;
    }

    booking.paymentStatus = 'FAILED';
    await booking.save();

    console.log(`✓ Booking ${booking.bookingId} → paymentStatus: FAILED (reason: ${reason})`);
}

module.exports = { startConsuming };
