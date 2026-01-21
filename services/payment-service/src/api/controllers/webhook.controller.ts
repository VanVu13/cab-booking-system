import { Request, Response } from 'express';
import { WebhookService } from '../../services/webhook.service';
import { createRequestLogger } from '../../utils/logger';

const webhookService = new WebhookService();

export class WebhookController {
    async handleStripeWebhook(req: Request, res: Response): Promise<void> {
        try {
            const signature = req.headers['stripe-signature'] as string;

            if (!signature) {
                res.status(400).json({
                    error: 'Bad Request',
                    message: 'Missing stripe-signature header',
                });
                return;
            }

            const correlationId = (req as any).correlationId;
            const logger = createRequestLogger(correlationId);

            logger.info('Processing Stripe webhook');

            const result = await webhookService.processWebhook({
                provider: 'stripe',
                payload: req.body,
                signature,
            });

            res.json(result);
        } catch (error: any) {
            res.status(400).json({
                error: 'Webhook Processing Failed',
                message: error.message,
            });
        }
    }

    async handleZaloPayWebhook(req: Request, res: Response): Promise<void> {
        try {
            const signature = req.headers['x-zalopay-signature'] as string || '';
            const correlationId = (req as any).correlationId;
            const logger = createRequestLogger(correlationId);

            logger.info('Processing ZaloPay webhook');

            const result = await webhookService.processWebhook({
                provider: 'zalopay',
                payload: JSON.stringify(req.body),
                signature,
            });

            res.json(result);
        } catch (error: any) {
            res.status(400).json({
                error: 'Webhook Processing Failed',
                message: error.message,
            });
        }
    }
}
