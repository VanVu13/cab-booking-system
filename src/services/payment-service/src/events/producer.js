const { getChannel, getPaymentExchangeName, getRoutingKeys } = require('../config/rabbitmq');

/**
 * Publish payment.completed event to RabbitMQ.
 * Called by webhookController after PSP notifies SUCCEEDED outcome.
 *
 * @param {Object} data - { paymentId, rideId, userId, driverId, amount, paymentMethod }
 */
async function publishPaymentCompleted(data) {
    const channel = getChannel();

    if (!channel) {
        console.warn('[PRODUCER] RabbitMQ not connected. Skipping payment.completed publish.');
        return false;
    }

    const event = {
        type: 'PaymentCompleted',
        paymentId: data.paymentId,
        rideId: data.rideId,
        userId: data.userId,
        driverId: data.driverId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        status: 'SUCCEEDED',
        timestamp: new Date().toISOString()
    };

    try {
        const exchange = getPaymentExchangeName();
        const routingKey = getRoutingKeys().PAYMENT_COMPLETED;

        channel.publish(
            exchange,
            routingKey,
            Buffer.from(JSON.stringify(event)),
            { persistent: true }
        );

        console.log(`✓ [PRODUCER] Published payment.completed for ride: ${event.rideId}`);
        return true;
    } catch (error) {
        console.error('[PRODUCER] Failed to publish payment.completed:', error.message);
        return false;
    }
}

/**
 * Publish payment.failed event to RabbitMQ.
 * Called by webhookController after PSP notifies FAILED outcome.
 * Downstream services (e.g. notification-service) can use this for compensation.
 *
 * @param {Object} data - { paymentId, rideId, userId, driverId, amount, reason }
 */
async function publishPaymentFailed(data) {
    const channel = getChannel();

    if (!channel) {
        console.warn('[PRODUCER] RabbitMQ not connected. Skipping payment.failed publish.');
        return false;
    }

    const event = {
        type: 'PaymentFailed',
        paymentId: data.paymentId,
        rideId: data.rideId,
        userId: data.userId,
        driverId: data.driverId,
        amount: data.amount,
        status: 'FAILED',
        reason: data.reason || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString()
    };

    try {
        const exchange = getPaymentExchangeName();
        const routingKey = getRoutingKeys().PAYMENT_FAILED;

        channel.publish(
            exchange,
            routingKey,
            Buffer.from(JSON.stringify(event)),
            { persistent: true }
        );

        console.log(`✓ [PRODUCER] Published payment.failed for ride: ${event.rideId} (reason: ${event.reason})`);
        return true;
    } catch (error) {
        console.error('[PRODUCER] Failed to publish payment.failed:', error.message);
        return false;
    }
}

module.exports = { publishPaymentCompleted, publishPaymentFailed };
