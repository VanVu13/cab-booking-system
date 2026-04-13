const Payment = require('../models/Payment');
const { publishPaymentCompleted, publishPaymentFailed } = require('../events/producer');

/**
 * Handle webhook callback from Mock PSP (pspSimulator).
 * The PSP fires this endpoint after processing payment asynchronously.
 *
 * POST /api/webhooks/psp
 */
async function handlePspWebhook(req, res) {
    try {
        const { pspReference, outcome, failureReason, timestamp } = req.body;

        // Basic validation
        if (!pspReference || !outcome) {
            console.warn('[WEBHOOK] Received invalid payload, missing pspReference or outcome.');
            return res.status(400).json({ error: 'Invalid webhook payload' });
        }

        console.log(`\n[WEBHOOK] Received PSP callback for pspReference: ${pspReference}`);
        console.log(`[WEBHOOK]   -> Outcome: ${outcome}`);

        // Signature verification would go here in production (HMAC-SHA256)
        // For Mock PSP, we trust all incoming webhooks on localhost

        // Find payment by pspReference
        const payment = await Payment.findOne({ where: { pspReference } });

        if (!payment) {
            console.warn(`[WEBHOOK] No payment found for pspReference: ${pspReference}`);
            return res.status(404).json({ error: 'Payment not found for this pspReference' });
        }

        // Guard against re-processing already finalized payments
        if (payment.status === 'SUCCEEDED' || payment.status === 'FAILED') {
            console.log(`[WEBHOOK] Payment ${payment.paymentId} already finalized (${payment.status}). Ignoring.`);
            return res.status(200).json({ message: 'Already processed', status: payment.status });
        }

        if (outcome === 'SUCCEEDED') {
            // Update payment status to SUCCEEDED
            payment.status = 'SUCCEEDED';
            await payment.save();

            console.log(`[WEBHOOK] ✅ Payment ${payment.paymentId} marked as SUCCEEDED for ride ${payment.rideId}`);

            // Publish success event to RabbitMQ
            await publishPaymentCompleted({
                paymentId: payment.paymentId,
                rideId: payment.rideId,
                userId: payment.userId,
                driverId: payment.driverId,
                amount: parseFloat(payment.amount),
                paymentMethod: payment.paymentMethod
            });

        } else if (outcome === 'FAILED') {
            // Update payment status to FAILED
            payment.status = 'FAILED';
            payment.failureReason = failureReason || 'PSP_DECLINED';
            await payment.save();

            console.log(`[WEBHOOK] ❌ Payment ${payment.paymentId} marked as FAILED. Reason: ${payment.failureReason}`);

            // Publish failure event to RabbitMQ
            // Other services (ride-service, notification-service) will handle compensation
            await publishPaymentFailed({
                paymentId: payment.paymentId,
                rideId: payment.rideId,
                userId: payment.userId,
                driverId: payment.driverId,
                amount: parseFloat(payment.amount),
                reason: payment.failureReason
            });
        } else {
            console.warn(`[WEBHOOK] Unknown outcome from PSP: ${outcome}`);
            return res.status(400).json({ error: `Unknown outcome: ${outcome}` });
        }

        return res.status(200).json({
            received: true,
            paymentId: payment.paymentId,
            status: payment.status
        });

    } catch (error) {
        console.error('[WEBHOOK] Error processing PSP webhook:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { handlePspWebhook };
