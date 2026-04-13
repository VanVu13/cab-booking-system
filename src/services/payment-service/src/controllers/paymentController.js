const Payment = require('../models/Payment');
const { processPayment } = require('../services/paymentProcessor');

/**
 * Charge payment (manual/REST trigger)
 * POST /payments/charge
 */
async function chargePayment(req, res) {
    try {
        const { rideId, amount, paymentMethod, paymentToken, passengerId } = req.body;

        // The sender of the request (could be driver or customer)
        const requestUserId = req.headers['x-user-id'];

        if (!requestUserId) {
            return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
        }

        // If a passengerId is explicitly provided in the body, it means a driver is charging on behalf of a passenger
        // So the actual customer paying is the passengerId, and the driver is the requestUserId
        const userId = passengerId || requestUserId;
        const driverId = passengerId ? requestUserId : null;

        if (!rideId || !amount) {
            return res.status(400).json({
                error: 'rideId and amount are required'
            });
        }

        // Check if payment already exists for this ride (idempotency guard)
        const existingPayment = await Payment.findOne({ where: { rideId } });
        if (existingPayment) {
            // If payment is already processing or succeeded, return it
            if (existingPayment.status === 'PROCESSING' || existingPayment.status === 'SUCCEEDED') {
                return res.status(200).json({
                    status: existingPayment.status,
                    paymentId: existingPayment.paymentId,
                    rideId: existingPayment.rideId,
                    amount: parseFloat(existingPayment.amount),
                    pspReference: existingPayment.pspReference,
                    alreadyProcessed: true
                });
            }

            // If payment previously failed, allow retry (return existing info - PSP will handle via webhook)
            if (existingPayment.status === 'FAILED') {
                return res.status(409).json({
                    error: 'Previous payment failed. Please retry via the charge endpoint.',
                    paymentId: existingPayment.paymentId,
                    status: existingPayment.status,
                    failureReason: existingPayment.failureReason
                });
            }
        }

        // Process payment via Mock PSP
        const payment = await processPayment({
            rideId,
            userId,
            driverId,
            amount,
            paymentMethod: paymentMethod || 'CASH',
            paymentToken: paymentToken
        });

        return res.status(202).json({
            status: 'PROCESSING',
            message: 'Payment submitted to PSP. Result will arrive via webhook.',
            paymentId: payment.paymentId,
            rideId: payment.rideId,
            amount: parseFloat(payment.amount),
            pspReference: payment.pspReference
        });

    } catch (error) {
        console.error('Charge payment error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Get payment by paymentId
 * GET /payments/:id
 */
async function getPaymentById(req, res) {
    try {
        const { id } = req.params;
        const userId = req.headers['x-user-id'];

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Query Scoping: Find by paymentId AND userId
        const payment = await Payment.findOne({
            where: {
                paymentId: id,
                userId: userId
            }
        });

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        return res.status(200).json({
            paymentId: payment.paymentId,
            rideId: payment.rideId,
            amount: parseFloat(payment.amount),
            currency: payment.currency,
            paymentMethod: payment.paymentMethod,
            status: payment.status,
            failureReason: payment.failureReason,
            createdAt: payment.created_at,
            updatedAt: payment.updated_at
        });

    } catch (error) {
        console.error('Get payment error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Get payment by rideId
 * GET /payments/ride/:rideId
 */
async function getPaymentByRideId(req, res) {
    try {
        const { rideId } = req.params;
        const userId = req.headers['x-user-id'];

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Query Scoping: Find by rideId (userId check relaxed for DEV)
        const payment = await Payment.findOne({
            where: {
                rideId: rideId
                // userId: userId
            }
        });

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found for this ride' });
        }

        return res.status(200).json({
            paymentId: payment.paymentId,
            rideId: payment.rideId,
            amount: parseFloat(payment.amount),
            currency: payment.currency,
            paymentMethod: payment.paymentMethod,
            status: payment.status,
            failureReason: payment.failureReason,
            createdAt: payment.created_at,
            updatedAt: payment.updated_at
        });

    } catch (error) {
        console.error('Get payment by ride error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    chargePayment,
    getPaymentById,
    getPaymentByRideId
};
