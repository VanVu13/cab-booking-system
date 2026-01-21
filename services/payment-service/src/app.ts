import express, { Express } from 'express';
import { correlationMiddleware } from './middleware/correlation.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import paymentRoutes from './api/routes/payment.routes';
import webhookRoutes from './api/routes/webhook.routes';
import metricsRoutes from './api/routes/metrics.routes';

export const createApp = (): Express => {
    const app = express();

    // Middleware
    app.use(correlationMiddleware);

    // For Stripe webhooks, we need raw body
    app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

    // JSON body parser for other routes
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Health check
    app.get('/health', (req, res) => {
        res.json({ status: 'healthy', service: 'payment-service' });
    });

    // Routes
    app.use('/payments', paymentRoutes);
    app.use('/webhooks', webhookRoutes);
    app.use('/metrics', metricsRoutes);

    // Error handling
    app.use(errorMiddleware);

    return app;
};
