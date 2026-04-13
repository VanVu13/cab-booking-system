const { v4: uuidv4 } = require('uuid');
const Payment = require('../models/Payment');
const { submitPaymentRequest } = require('./mock-psp/pspSimulator');

/**
 * Process a payment for a completed ride.
 * This function now delegates to the Mock PSP (like Stripe/Momo would work):
 *  1. Creates a Payment record in PROCESSING state.
 *  2. Generates an idempotencyKey to prevent duplicate processing.
 *  3. Submits to PSP Simulator -> gets back a pspReference immediately.
 *  4. Saves pspReference to DB and returns.
 *  5. The actual SUCCEEDED/FAILED outcome comes via webhook callback (webhookController.js).
 *
 * @param {Object} params - { rideId, userId, amount, paymentMethod }
 * @param {Object} params - { rideId, userId, driverId, amount, paymentMethod, paymentToken }
 * @returns {Promise<Payment>} The newly created payment record
 */
async function processPayment({ rideId, userId, driverId, amount, paymentMethod = 'CASH', paymentToken }) {
    const paymentId = `pay_${uuidv4().slice(0, 8)}`;
    // idempotencyKey uniquely identifies this payment attempt to prevent duplicate PSP calls
    const idempotencyKey = `${rideId}_${paymentId}`;

    console.log(`[PAYMENT] Initiating payment for ride ${rideId}`);
    console.log(`[PAYMENT]   paymentId      : ${paymentId}`);
    console.log(`[PAYMENT]   idempotencyKey : ${idempotencyKey}`);
    console.log(`[PAYMENT]   amount         : ${amount} VND`);
    console.log(`[PAYMENT]   method         : ${paymentMethod}`);

    // Step 1: Create payment record as PROCESSING
    const payment = await Payment.create({
        paymentId,
        rideId,
        userId,
        driverId,
        amount,
        paymentMethod,
        idempotencyKey,
        status: 'PROCESSING'
    });

    // Step 2: Submit to Mock PSP - returns immediately with a pspReference
    const pspResult = submitPaymentRequest({
        paymentId: payment.paymentId,
        rideId: payment.rideId,
        amount: parseFloat(payment.amount),
        method: payment.paymentMethod,
        metadata: { userId, idempotencyKey, paymentToken }
    });

    // Step 3: Store pspReference for webhook lookup
    payment.pspReference = pspResult.pspReference;
    await payment.save();

    console.log(`[PAYMENT] ✅ Payment ${paymentId} submitted to PSP. pspReference: ${pspResult.pspReference}`);
    console.log(`[PAYMENT]    Waiting for PSP webhook callback...`);

    // Return here - the actual payment result will arrive via webhook
    return payment;
}

module.exports = { processPayment };
