import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { idempotencyMiddleware } from '../../middleware/idempotency.middleware';
import { adminMiddleware } from '../../middleware/admin.middleware';

const router = Router();
const controller = new PaymentController();

// Create payment (requires idempotency key)
router.post('/', idempotencyMiddleware, (req, res) => controller.createPayment(req, res));

// Get payment by ID
router.get('/:paymentId', (req, res) => controller.getPayment(req, res));

// Get payment by ride ID
router.get('/by-ride/:rideId', (req, res) => controller.getPaymentByRideId(req, res));

// Confirm payment
router.post('/:paymentId/confirm', (req, res) => controller.confirmPayment(req, res));

// Retry payment
router.post('/:paymentId/retry', (req, res) => controller.retryPayment(req, res));

// Refund payment (admin only)
router.post('/:paymentId/refund', adminMiddleware, (req, res) => controller.refundPayment(req, res));

export default router;
