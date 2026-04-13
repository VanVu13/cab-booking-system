const express = require('express');
const router = express.Router();
const { handlePspWebhook } = require('../controllers/webhookController');

/**
 * POST /api/webhooks/psp
 * Internal webhook endpoint triggered by Mock PSP simulator.
 * In production, this would be called by Stripe, Momo, VNPay, etc.
 */
router.post('/psp', handlePspWebhook);

module.exports = router;
