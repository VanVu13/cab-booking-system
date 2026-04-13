const { getChannel, getQueueName, getExchangeName, getMaxRetryAttempts } = require('../config/rabbitmq');
const Payment = require('../models/Payment');
const { processPayment } = require('../services/paymentProcessor');

/**
 * Start consuming ride.completed events from RabbitMQ.
 * When a ride completes, automatically initiate payment processing via Mock PSP.
 */
async function startConsuming() {
    const channel = getChannel();

    if (!channel) {
        console.warn('[PAYMENT-CONSUMER] RabbitMQ not connected. Skipping consumer setup.');
        return;
    }

    const queue = getQueueName();

    console.log(`✓ Payment consumer listening on queue: ${queue}`);

    channel.consume(queue, async (msg) => {
        if (msg === null) return;

        let event;
        try {
            event = JSON.parse(msg.content.toString());
        } catch (parseError) {
            console.error('[PAYMENT-CONSUMER] Failed to parse message JSON. Sending to DLQ.');
            // Bad format - don't requeue, send to DLQ
            channel.nack(msg, false, false);
            return;
        }

        const routingKey = msg.fields.routingKey;
        const retryCount = (msg.properties.headers && msg.properties.headers['x-retry-count']) || 0;

        console.log(`\n[PAYMENT-CONSUMER] Received ${routingKey} (attempt #${retryCount + 1}):`, JSON.stringify(event, null, 2));

        try {
            if (routingKey === 'ride.completed') {
                await handleRideCompleted(event);
            } else {
                console.warn(`[PAYMENT-CONSUMER] No handler for event: ${routingKey}. Acking.`);
            }

            // ACK: Message processed successfully
            channel.ack(msg);

        } catch (error) {
            console.error(`[PAYMENT-CONSUMER] Error processing ${routingKey}:`, error.message);

            const maxRetries = getMaxRetryAttempts();

            if (retryCount < maxRetries) {
                // Re-publish with incremented retry count header (manual retry pattern)
                console.warn(`[PAYMENT-CONSUMER] Retrying message (${retryCount + 1}/${maxRetries})...`);
                const retryHeaders = {
                    ...msg.properties.headers,
                    'x-retry-count': retryCount + 1,
                    'x-last-error': error.message
                };
                channel.publish(
                    msg.fields.exchange,
                    msg.fields.routingKey,
                    msg.content,
                    { ...msg.properties, headers: retryHeaders, persistent: true }
                );
                // ACK original, since we re-published the retry manually
                channel.ack(msg);
            } else {
                // Exhausted retries - NACK without requeue -> goes to DLQ via DLX
                console.error(`[PAYMENT-CONSUMER] Max retries (${maxRetries}) exceeded. Sending to DLQ.`);
                channel.nack(msg, false, false);
            }
        }
    });
}

/**
 * Handle ride.completed event:
 * Idempotency check → initiate payment → let PSP handle the rest via webhook
 */
async function handleRideCompleted(event) {
    const { rideId, finalPrice, userId, driverId, paymentMethod, paymentToken } = event;

    if (!rideId) {
        throw new Error('ride.completed event missing rideId');
    }

    // ---- IDEMPOTENCY CHECK ----
    const existingPayment = await Payment.findOne({ where: { rideId } });
    if (existingPayment) {
        console.log(`[PAYMENT-CONSUMER] Idempotency: Payment for ride ${rideId} already exists (status: ${existingPayment.status}). Skipping.`);
        return;
    }

    // ---- PROCESS PAYMENT (ONLY FOR NON-CASH) ----
    // For CASH, we wait for the Driver to explicitly hit the /charge endpoint
    if (paymentMethod === 'WALLET' || paymentMethod === 'CARD') {
        let tokenToUse = paymentToken;
        if (!tokenToUse && userId) {
            const UserPaymentMethod = require('../models/UserPaymentMethod');
            try {
                // Fetch default payment method if no token provided
                const methodRecord = await UserPaymentMethod.findOne({
                    where: { userId, method: paymentMethod, isDefault: true, status: 'ACTIVE' }
                });
                if (methodRecord) {
                    tokenToUse = methodRecord.token;
                } else {
                    // Try fallback to any active method of that type
                    const anyMethodRecord = await UserPaymentMethod.findOne({
                        where: { userId, method: paymentMethod, status: 'ACTIVE' }
                    });
                    if (anyMethodRecord) tokenToUse = anyMethodRecord.token;
                }
            } catch (err) {
                console.error('[PAYMENT-CONSUMER] Error fetching token from DB:', err.message);
            }
        }

        await processPayment({
            rideId,
            userId: userId || null,
            amount: finalPrice || 0,
            paymentMethod: paymentMethod,
            paymentToken: tokenToUse || null,
            driverId: driverId || null
        });
        console.log(`[PAYMENT-CONSUMER] ✓ Auto-payment initiated for ride ${rideId} (method: ${paymentMethod}, token: ${tokenToUse ? 'Provided/Found' : 'Missing'})`);
    } else {
        console.log(`[PAYMENT-CONSUMER] ℹ️ Ride ${rideId} uses CASH. Waiting for driver manual confirmation.`);
    }
}

module.exports = { startConsuming };
