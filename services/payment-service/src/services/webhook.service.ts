import { Knex } from 'knex';
import { PaymentRepository } from '../repositories/payment.repository';
import { WebhookRepository } from '../repositories/webhook.repository';
import { OutboxRepository } from '../repositories/outbox.repository';
import { PaymentProviderFactory } from '../providers/factory';
import { PaymentStatus, OutboxEventType } from '../domain/types';
import getDb from '../utils/db';
import { createLogger } from '../utils/logger';

const logger = createLogger('WebhookService');

export class WebhookService {
    private paymentRepo: PaymentRepository;
    private webhookRepo: WebhookRepository;
    private outboxRepo: OutboxRepository;
    private db: Knex;

    constructor() {
        this.paymentRepo = new PaymentRepository();
        this.webhookRepo = new WebhookRepository();
        this.outboxRepo = new OutboxRepository();
        this.db = getDb();
    }

    async processWebhook(params: {
        provider: string;
        payload: string | Buffer;
        signature: string;
    }): Promise<{ processed: boolean; message: string }> {
        try {
            // Verify webhook signature
            const providerAdapter = PaymentProviderFactory.getProvider(params.provider);
            const verification = await providerAdapter.verifyWebhook({
                payload: params.payload,
                signature: params.signature,
            });

            if (!verification.valid) {
                logger.warn({ provider: params.provider }, 'Invalid webhook signature');
                return { processed: false, message: 'Invalid signature' };
            }

            const event = verification.event;
            const eventId = event.id || event.data?.orderId || `${Date.now()}`;

            // Check if webhook already processed (idempotency)
            const existingWebhook = await this.webhookRepo.findByProviderAndEventId(
                params.provider,
                eventId
            );

            if (existingWebhook) {
                logger.info({ provider: params.provider, eventId }, 'Webhook already processed');
                return { processed: true, message: 'Already processed' };
            }

            // Store webhook event
            const webhookEvent = await this.webhookRepo.create({
                provider: params.provider,
                eventId,
                signatureValid: true,
                payload: event,
            });

            if (!webhookEvent) {
                // Duplicate event (race condition)
                return { processed: true, message: 'Already processed (race)' };
            }

            // Process the webhook event
            await this.handleWebhookEvent(params.provider, event);

            // Mark as processed
            await this.webhookRepo.markAsProcessed(webhookEvent.id);

            logger.info({ provider: params.provider, eventId }, 'Webhook processed successfully');

            return { processed: true, message: 'Processed successfully' };
        } catch (error: any) {
            logger.error({ error: error.message, provider: params.provider }, 'Webhook processing failed');
            throw error;
        }
    }

    private async handleWebhookEvent(provider: string, event: any): Promise<void> {
        const trx = await this.db.transaction();

        try {
            let paymentId: string | null = null;
            let newStatus: PaymentStatus | null = null;

            // Extract payment info based on provider
            if (provider === 'stripe') {
                paymentId = event.data?.object?.metadata?.paymentId;

                switch (event.type) {
                    case 'payment_intent.succeeded':
                        newStatus = PaymentStatus.SUCCEEDED;
                        break;
                    case 'payment_intent.payment_failed':
                        newStatus = PaymentStatus.FAILED;
                        break;
                    case 'payment_intent.canceled':
                        newStatus = PaymentStatus.CANCELED;
                        break;
                    case 'payment_intent.requires_action':
                        newStatus = PaymentStatus.REQUIRES_ACTION;
                        break;
                }
            } else if (provider === 'zalopay') {
                paymentId = event.data?.paymentId;

                if (event.type === 'payment.success') {
                    newStatus = PaymentStatus.SUCCEEDED;
                } else if (event.type === 'payment.failed') {
                    newStatus = PaymentStatus.FAILED;
                }
            }

            if (!paymentId || !newStatus) {
                logger.warn({ provider, event }, 'Unable to extract payment info from webhook');
                await trx.commit();
                return;
            }

            // Update payment status
            const payment = await this.paymentRepo.findById(paymentId);
            if (!payment) {
                logger.warn({ paymentId }, 'Payment not found for webhook event');
                await trx.commit();
                return;
            }

            // Only update if status changed
            if (payment.status === newStatus) {
                logger.info({ paymentId, status: newStatus }, 'Payment status unchanged');
                await trx.commit();
                return;
            }

            const updatedPayment = await this.paymentRepo.updateStatus(
                paymentId,
                newStatus,
                undefined,
                trx
            );

            // Create outbox event
            let eventType: OutboxEventType | null = null;
            if (newStatus === PaymentStatus.SUCCEEDED) {
                eventType = OutboxEventType.PAYMENT_COMPLETED;
            } else if (newStatus === PaymentStatus.FAILED) {
                eventType = OutboxEventType.PAYMENT_FAILED;
            }

            if (eventType) {
                await this.outboxRepo.create(
                    {
                        aggregateType: 'PAYMENT',
                        aggregateId: updatedPayment.id,
                        type: eventType,
                        payload: {
                            paymentId: updatedPayment.id,
                            rideId: updatedPayment.ride_id,
                            userId: updatedPayment.user_id,
                            amount: updatedPayment.amount,
                            currency: updatedPayment.currency,
                            status: updatedPayment.status,
                            provider: updatedPayment.provider,
                            providerPaymentId: updatedPayment.provider_payment_id,
                        },
                    },
                    trx
                );
            }

            await trx.commit();

            logger.info(
                { paymentId, oldStatus: payment.status, newStatus },
                'Payment status updated from webhook'
            );
        } catch (error: any) {
            await trx.rollback();
            logger.error({ error: error.message }, 'Failed to handle webhook event');
            throw error;
        }
    }
}
