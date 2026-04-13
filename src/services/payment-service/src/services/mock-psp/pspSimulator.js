const { v4: uuidv4 } = require('uuid');
const http = require('http');

// Webhook URL that receives callback from this fake PSP
// Points to payment-service's own internal webhook endpoint
const WEBHOOK_HOST = process.env.WEBHOOK_HOST || 'localhost';
const WEBHOOK_PORT = process.env.PORT || 3004;
const WEBHOOK_PATH = '/api/webhooks/psp';

// Payment processing delay in milliseconds (simulates bank processing time)
const PSP_PROCESSING_DELAY_MS = parseInt(process.env.PSP_PROCESSING_DELAY_MS) || 3000;

// Payment success rate (0.9 = 90% success)
const SUCCESS_RATE = parseFloat(process.env.PSP_SUCCESS_RATE) || 0.9;

/**
 * Simulate submitting a payment request to an external PSP (like Stripe/Momo).
 * Returns immediately with a PENDING status and a unique pspReference.
 * Asynchronously fires a webhook callback after a delay to simulate bank response.
 *
 * @param {Object} params
 * @param {string} params.paymentId - Internal payment ID
 * @param {string} params.rideId - Internal ride ID
 * @param {number} params.amount - Amount in VND
 * @param {string} params.method - Payment method (CASH, CARD, WALLET)
 * @param {Object} params.metadata - Additional context
 * @returns {{ pspReference: string, status: 'PENDING' }}
 */
function submitPaymentRequest({ paymentId, rideId, amount, method, metadata = {} }) {
    const pspReference = `psp_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const paymentToken = metadata.paymentToken; // Extract token

    console.log(`[Mock PSP] Payment request received.`);
    console.log(`[Mock PSP]   -> Internal paymentId : ${paymentId}`);
    console.log(`[Mock PSP]   -> PSP Reference      : ${pspReference}`);
    console.log(`[Mock PSP]   -> Amount             : ${amount} VND`);
    console.log(`[Mock PSP]   -> Method             : ${method}`);
    if (paymentToken) {
        console.log(`[Mock PSP]   -> Token provided     : ${paymentToken}`);
    }
    console.log(`[Mock PSP]   -> Webhook fires in   : ${PSP_PROCESSING_DELAY_MS}ms`);

    // Fire webhook after delay (non-blocking)
    setTimeout(() => {
        _fireWebhook({ pspReference, paymentId, rideId, amount, method, paymentToken });
    }, PSP_PROCESSING_DELAY_MS);

    return {
        pspReference,
        status: 'PENDING'
    };
}

/**
 * Internal: Fires the simulated webhook callback to our own payment-service endpoint.
 * Simulates the PSP sending an async notification after processing.
 */
function _fireWebhook({ pspReference, paymentId, rideId, amount, method, paymentToken }) {
    // Determine payment outcome based on method:
    // - CASH: always SUCCEEDED (driver collects physically)
    // - WALLET: always SUCCEEDED (pre-funded; balance checked at booking time)
    // - CARD: requires valid token starting with 'tok_'
    let outcome;
    let failureReason = null;

    if (method === 'CASH' || method === 'WALLET') {
        // Both cash and wallet are guaranteed — wallet is pre-funded digital money
        outcome = 'SUCCEEDED';
        console.log(`[Mock PSP] ${method} payment always succeeds.`);
    } else {
        // CARD requires a valid token
        if (!paymentToken) {
            outcome = 'FAILED';
            failureReason = 'MISSING_PAYMENT_TOKEN';
        } else if (paymentToken.startsWith('tok_expired')) {
            outcome = 'FAILED';
            failureReason = 'EXPIRED_CARD';
        } else if (paymentToken.startsWith('tok_')) {
            // Valid token prefix, apply success rate
            outcome = Math.random() < SUCCESS_RATE ? 'SUCCEEDED' : 'FAILED';
            if (outcome === 'FAILED') failureReason = _getRandomFailureReason();
        } else {
            outcome = 'FAILED';
            failureReason = 'INVALID_PAYMENT_TOKEN';
        }
    }

    const payload = {
        type: 'payment.status_update',
        pspReference,
        paymentId,
        rideId,
        amount,
        outcome,
        failureReason,
        timestamp: new Date().toISOString(),
        // Signature would be HMAC-SHA256 in production
        signature: `mock_sig_${pspReference}`
    };

    const bodyStr = JSON.stringify(payload);

    console.log(`\n[Mock PSP] Firing webhook to http://${WEBHOOK_HOST}:${WEBHOOK_PORT}${WEBHOOK_PATH}`);
    console.log(`[Mock PSP]   -> Outcome: ${outcome}${failureReason ? ` (${failureReason})` : ''}`);

    const options = {
        hostname: WEBHOOK_HOST,
        port: WEBHOOK_PORT,
        path: WEBHOOK_PATH,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyStr),
            'x-psp-signature': payload.signature
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
            console.log(`[Mock PSP] Webhook response status: ${res.statusCode}`);
        });
    });

    req.on('error', (err) => {
        console.error(`[Mock PSP] Failed to fire webhook: ${err.message}`);
    });

    req.write(bodyStr);
    req.end();
}

/**
 * Returns a random failure reason to make simulations varied and realistic.
 */
function _getRandomFailureReason() {
    const reasons = [
        'INSUFFICIENT_FUNDS',
        'CARD_DECLINED',
        'EXPIRED_CARD',
        'DO_NOT_HONOR',
        'FRAUD_SUSPECTED'
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
}

module.exports = { submitPaymentRequest };
