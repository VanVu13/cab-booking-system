import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();
const controller = new WebhookController();

// Stripe webhook
router.post('/stripe', (req, res) => controller.handleStripeWebhook(req, res));

// ZaloPay webhook
router.post('/zalopay', (req, res) => controller.handleZaloPayWebhook(req, res));

export default router;
