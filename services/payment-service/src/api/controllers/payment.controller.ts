import { Request, Response } from 'express';
import { PaymentService } from '../../services/payment.service';
import { CreatePaymentRequest, ConfirmPaymentRequest, RefundPaymentRequest } from '../../domain/types';
import { createRequestLogger } from '../../utils/logger';

const paymentService = new PaymentService();

export class PaymentController {
    async createPayment(req: Request, res: Response): Promise<void> {
        try {
            const correlationId = (req as any).correlationId;
            const idempotencyKey = (req as any).idempotencyKey;
            const logger = createRequestLogger(correlationId);

            const request: CreatePaymentRequest = req.body;

            logger.info({ request, idempotencyKey }, 'Creating payment');

            const result = await paymentService.createPayment(request, idempotencyKey);

            res.status(201).json(result);
        } catch (error: any) {
            res.status(400).json({
                error: 'Payment Creation Failed',
                message: error.message,
            });
        }
    }

    async getPayment(req: Request, res: Response): Promise<void> {
        try {
            const { paymentId } = req.params;
            const payment = await paymentService.getPayment(paymentId);

            if (!payment) {
                res.status(404).json({
                    error: 'Not Found',
                    message: 'Payment not found',
                });
                return;
            }

            res.json(payment);
        } catch (error: any) {
            res.status(500).json({
                error: 'Internal Server Error',
                message: error.message,
            });
        }
    }

    async getPaymentByRideId(req: Request, res: Response): Promise<void> {
        try {
            const { rideId } = req.params;
            const payment = await paymentService.getPaymentByRideId(rideId);

            if (!payment) {
                res.status(404).json({
                    error: 'Not Found',
                    message: 'Payment not found for this ride',
                });
                return;
            }

            res.json(payment);
        } catch (error: any) {
            res.status(500).json({
                error: 'Internal Server Error',
                message: error.message,
            });
        }
    }

    async confirmPayment(req: Request, res: Response): Promise<void> {
        try {
            const { paymentId } = req.params;
            const request: ConfirmPaymentRequest = req.body;
            const correlationId = (req as any).correlationId;
            const logger = createRequestLogger(correlationId);

            logger.info({ paymentId, request }, 'Confirming payment');

            const payment = await paymentService.confirmPayment(paymentId, request);

            res.json(payment);
        } catch (error: any) {
            res.status(400).json({
                error: 'Payment Confirmation Failed',
                message: error.message,
            });
        }
    }

    async retryPayment(req: Request, res: Response): Promise<void> {
        try {
            const { paymentId } = req.params;
            const correlationId = (req as any).correlationId;
            const logger = createRequestLogger(correlationId);

            logger.info({ paymentId }, 'Retrying payment');

            const payment = await paymentService.retryPayment(paymentId);

            res.json(payment);
        } catch (error: any) {
            res.status(400).json({
                error: 'Payment Retry Failed',
                message: error.message,
            });
        }
    }

    async refundPayment(req: Request, res: Response): Promise<void> {
        try {
            const { paymentId } = req.params;
            const request: RefundPaymentRequest = req.body;
            const correlationId = (req as any).correlationId;
            const logger = createRequestLogger(correlationId);

            logger.info({ paymentId, request }, 'Refunding payment');

            const payment = await paymentService.refundPayment(paymentId, request);

            res.json(payment);
        } catch (error: any) {
            res.status(400).json({
                error: 'Payment Refund Failed',
                message: error.message,
            });
        }
    }
}
