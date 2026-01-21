import Stripe from 'stripe';
import { IPaymentProvider } from './interface';
import { PaymentProviderResponse, PaymentStatus } from '../domain/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('StripeAdapter');

export class StripeAdapter implements IPaymentProvider {
    private stripe: Stripe;
    private webhookSecret: string;

    constructor() {
        const apiKey = process.env.STRIPE_API_KEY;
        if (!apiKey) {
            throw new Error('STRIPE_API_KEY is not configured');
        }

        this.stripe = new Stripe(apiKey);

        this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    }

    async createPayment(params: {
        amount: number;
        currency: string;
        metadata?: any;
    }): Promise<PaymentProviderResponse> {
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: params.amount,
                currency: params.currency.toLowerCase(),
                metadata: params.metadata || {},
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            logger.info({ paymentIntentId: paymentIntent.id }, 'Stripe payment intent created');

            return {
                success: true,
                providerPaymentId: paymentIntent.id,
                status: this.mapStripeStatus(paymentIntent.status),
                clientSecret: paymentIntent.client_secret || undefined,
                requiresAction: paymentIntent.status === 'requires_action',
            };
        } catch (error: any) {
            logger.error({ error: error.message }, 'Stripe payment creation failed');
            return {
                success: false,
                providerPaymentId: null,
                status: PaymentStatus.FAILED,
                failureCode: error.code || 'stripe_error',
                failureMessage: error.message,
            };
        }
    }

    async confirmPayment(params: {
        providerPaymentId: string;
        paymentMethodId?: string;
    }): Promise<PaymentProviderResponse> {
        try {
            const paymentIntent = await this.stripe.paymentIntents.confirm(
                params.providerPaymentId,
                params.paymentMethodId ? { payment_method: params.paymentMethodId } : undefined
            );

            logger.info({ paymentIntentId: paymentIntent.id }, 'Stripe payment confirmed');

            return {
                success: paymentIntent.status === 'succeeded',
                providerPaymentId: paymentIntent.id,
                status: this.mapStripeStatus(paymentIntent.status),
                requiresAction: paymentIntent.status === 'requires_action',
            };
        } catch (error: any) {
            logger.error({ error: error.message }, 'Stripe payment confirmation failed');
            return {
                success: false,
                providerPaymentId: params.providerPaymentId,
                status: PaymentStatus.FAILED,
                failureCode: error.code || 'stripe_error',
                failureMessage: error.message,
            };
        }
    }

    async refundPayment(params: {
        providerPaymentId: string;
        amount?: number;
        reason?: string;
    }): Promise<PaymentProviderResponse> {
        try {
            const refund = await this.stripe.refunds.create({
                payment_intent: params.providerPaymentId,
                amount: params.amount,
                reason: params.reason as any,
            });

            logger.info({ refundId: refund.id }, 'Stripe refund created');

            return {
                success: refund.status === 'succeeded',
                providerPaymentId: refund.id,
                status: refund.status === 'succeeded' ? PaymentStatus.REFUNDED : PaymentStatus.PENDING,
            };
        } catch (error: any) {
            logger.error({ error: error.message }, 'Stripe refund failed');
            return {
                success: false,
                providerPaymentId: null,
                status: PaymentStatus.FAILED,
                failureCode: error.code || 'stripe_error',
                failureMessage: error.message,
            };
        }
    }

    async verifyWebhook(params: {
        payload: string | Buffer;
        signature: string;
    }): Promise<{ valid: boolean; event?: any }> {
        try {
            const event = this.stripe.webhooks.constructEvent(
                params.payload,
                params.signature,
                this.webhookSecret
            );

            logger.info({ eventType: event.type, eventId: event.id }, 'Stripe webhook verified');

            return {
                valid: true,
                event,
            };
        } catch (error: any) {
            logger.error({ error: error.message }, 'Stripe webhook verification failed');
            return {
                valid: false,
            };
        }
    }

    private mapStripeStatus(stripeStatus: string): PaymentStatus {
        switch (stripeStatus) {
            case 'succeeded':
                return PaymentStatus.SUCCEEDED;
            case 'processing':
            case 'requires_payment_method':
                return PaymentStatus.PENDING;
            case 'requires_action':
            case 'requires_confirmation':
                return PaymentStatus.REQUIRES_ACTION;
            case 'canceled':
                return PaymentStatus.CANCELED;
            case 'requires_capture':
                return PaymentStatus.PENDING;
            default:
                return PaymentStatus.FAILED;
        }
    }
}
