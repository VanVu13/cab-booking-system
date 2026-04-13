const express = require('express');
const router = express.Router();
const {
    chargePayment,
    getPaymentById,
    getPaymentByRideId
} = require('../controllers/paymentController');
const {
    addPaymentMethod,
    getUserPaymentMethods
} = require('../controllers/paymentMethodController');


// POST /payments/charge - Charge payment for a ride
router.post('/charge', chargePayment);

// GET /payments/ride/:rideId - Get payment by ride ID
router.get('/ride/:rideId', getPaymentByRideId);

// GET /payments/:id - Get payment by payment ID
router.get('/:id', getPaymentById);

// POST /payments/methods/add - Add new payment method (Mock Tokenization)
router.post('/methods/add', addPaymentMethod);

// GET /payments/methods - Get user's linked payment methods
router.get('/methods', getUserPaymentMethods);

module.exports = router;
