import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import {
    CreatePaymentRequest,
    CreatePaymentResponse,
    ConfirmPaymentRequest,
    RefundPaymentRequest,
    Payment,
    PaymentStatus,
    AttemptStatus,
    OutboxEventType,
} from '../domain/types';
import { PaymentRepository } from '../repositories/payment.repository';
import { OutboxRepository } from '../repositories/outbox.repository';
import { AttemptRepository } from '../repositories/attempt.repository';
import { PaymentProviderFactory } from '../providers/factory';
import { RetryService } from './retry.service';
import getDb from '../utils/db';
import { createLogger } from '../utils/logger';
import {
    paymentSuccessCounter,
    paymentFailedCounter,
    paymentAttemptsCounter,
    paymentProviderLatencyHistogram,
} from '../utils/metrics';

const logger = createLogger('PaymentService');

export class PaymentService {
    private paymentRepo: PaymentRepository;
    private outboxRepo: OutboxRepository;
    private attemptRepo: AttemptRepository;
    private retryService: RetryService;
    private db: Knex;

    constructor() {
        this.paymentRepo = new PaymentRepository();
        this.outboxRepo = new OutboxRepository();
        this.attemptRepo = new AttemptRepository();
        this.retryService = new RetryService();
        this.db = getDb();
    }

    async createPayment(
        request: CreatePaymentRequest,
        idempotencyKey: string
    ): Promise<CreatePaymentResponse> {
        // Check idempotency
        const existingPayment = await this.paymentRepo.findByIdempotencyKey(idempotencyKey);
        if (existingPayment) {
            logger.info({ paymentId: existingPayment.id }, 'Returning cached payment (idempotent)');
            return this.mapToResponse(existingPayment);
        }

        // Check if payment already exists for this ride
        const existingRidePayment = await this.paymentRepo.findByRideId(request.rideId);
        if (existingRidePayment) {
            throw new Error(`Payment already exists for ride: ${request.rideId}`);
        }

        // Create payment in transaction
        const trx = await this.db.transaction();

        try {
            // Create payment record
            const payment = await this.paymentRepo.create(
                {
                    ride_id: request.rideId,
                    user_id: request.userId,
                    amount: request.amount,
                    currency: request.currency,
                    method: request.method,
                    provider: request.provider,
                    provider_payment_id: null,
                    status: PaymentStatus.INITIATED,
                    failure_code: null,
                    failure_message: null,
                    idempotency_key: idempotencyKey,
                    attempt_count: 0,
                },
                trx
            );

            logger.info({ paymentId: payment.id }, 'Payment created');

            // Call payment provider with retry
            const providerResult = await this.callProviderWithRetry(
                payment.id,
                request.provider,
                {
                    amount: request.amount,
                    currency: request.currency,
                    metadata: {
                        ...request.metadata,
                        rideId: request.rideId,
                        userId: request.userId,
                        paymentId: payment.id,
                    },
                }
            );

            // Update payment with provider result
            const updatedPayment = await this.paymentRepo.update(
                payment.id,
                {
                    provider_payment_id: providerResult.providerPaymentId,
                    status: providerResult.status,
                    failure_code: providerResult.failureCode || null,
                    failure_message: providerResult.failureMessage || null,
                },
                trx
            );

            // Create outbox event if payment succeeded or failed
            if (
                providerResult.status === PaymentStatus.SUCCEEDED ||
                providerResult.status === PaymentStatus.FAILED
            ) {
                await this.createOutboxEvent(updatedPayment, trx);
            }

            await trx.commit();

            // Update metrics
            if (providerResult.status === PaymentStatus.SUCCEEDED) {
                paymentSuccessCounter.inc({ provider: request.provider, method: request.method });
            } else if (providerResult.status === PaymentStatus.FAILED) {
                paymentFailedCounter.inc({
                    provider: request.provider,
                    method: request.method,
                    failure_code: providerResult.failureCode || 'unknown',
                });
            }

            logger.info(
                { paymentId: updatedPayment.id, status: updatedPayment.status },
                'Payment processed'
            );

            return this.mapToResponse(updatedPayment, providerResult.clientSecret);
        } catch (error: any) {
            await trx.rollback();
            logger.error({ error: error.message }, 'Payment creation failed');
            throw error;
        }
    }

    async getPayment(paymentId: string): Promise<Payment | null> {
        return this.paymentRepo.findById(paymentId);
    }

    async getPaymentByRideId(rideId: string): Promise<Payment | null> {
        return this.paymentRepo.findByRideId(rideId);
    }

    async confirmPayment(
        paymentId: string,
        request: ConfirmPaymentRequest
    ): Promise<Payment> {
        const payment = await this.paymentRepo.findById(paymentId);
        if (!payment) {
            throw new Error('Payment not found');
        }

        if (payment.status !== PaymentStatus.REQUIRES_ACTION && payment.status !== PaymentStatus.PENDING) {
            throw new Error(`Payment cannot be confirmed in status: ${payment.status}`);
        }

        const trx = await this.db.transaction();

        try {
            const provider = PaymentProviderFactory.getProvider(payment.provider);
            const startTime = Date.now();

            const result = await provider.confirmPayment({
                providerPaymentId: payment.provider_payment_id!,
                paymentMethodId: request.paymentMethodId,
            });

            const latency = Date.now() - startTime;
            paymentProviderLatencyHistogram.observe({ provider: payment.provider, operation: 'confirm' }, latency);

            await this.attemptRepo.create({
                paymentId: payment.id,
                status: result.success ? AttemptStatus.SUCCESS : AttemptStatus.FAILURE,
                requestPayload: request,
                responsePayload: result,
                latencyMs: latency,
            });

            const updatedPayment = await this.paymentRepo.update(
                paymentId,
                {
                    status: result.status,
                    failure_code: result.failureCode || null,
                    failure_message: result.failureMessage || null,
                },
                trx
            );

            if (result.status === PaymentStatus.SUCCEEDED || result.status === PaymentStatus.FAILED) {
                await this.createOutboxEvent(updatedPayment, trx);
            }

            await trx.commit();

            logger.info({ paymentId, status: result.status }, 'Payment confirmed');

            return updatedPayment;
        } catch (error: any) {
            await trx.rollback();
            logger.error({ paymentId, error: error.message }, 'Payment confirmation failed');
            throw error;
        }
    }

    async retryPayment(paymentId: string): Promise<Payment> {
        const payment = await this.paymentRepo.findById(paymentId);
        if (!payment) {
            throw new Error('Payment not found');
        }

        if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.FAILED) {
            throw new Error(`Payment cannot be retried in status: ${payment.status}`);
        }

        const trx = await this.db.transaction();

        try {
            const provider = PaymentProviderFactory.getProvider(payment.provider);
            const startTime = Date.now();

            const result = await provider.createPayment({
                amount: payment.amount,
                currency: payment.currency,
                metadata: { paymentId: payment.id },
            });

            const latency = Date.now() - startTime;
            paymentProviderLatencyHistogram.observe({ provider: payment.provider, operation: 'retry' }, latency);

            await this.attemptRepo.create({
                paymentId: payment.id,
                status: result.success ? AttemptStatus.SUCCESS : AttemptStatus.FAILURE,
                requestPayload: { retry: true },
                responsePayload: result,
                latencyMs: latency,
            });

            await this.paymentRepo.incrementAttemptCount(paymentId, trx);

            const updatedPayment = await this.paymentRepo.update(
                paymentId,
                {
                    provider_payment_id: result.providerPaymentId || payment.provider_payment_id,
                    status: result.status,
                    failure_code: result.failureCode || null,
                    failure_message: result.failureMessage || null,
                },
                trx
            );

            if (result.status === PaymentStatus.SUCCEEDED || result.status === PaymentStatus.FAILED) {
                await this.createOutboxEvent(updatedPayment, trx);
            }

            await trx.commit();

            logger.info({ paymentId, status: result.status }, 'Payment retried');

            return updatedPayment;
        } catch (error: any) {
            await trx.rollback();
            logger.error({ paymentId, error: error.message }, 'Payment retry failed');
            throw error;
        }
    }

    async refundPayment(
        paymentId: string,
        request: RefundPaymentRequest
    ): Promise<Payment> {
        const payment = await this.paymentRepo.findById(paymentId);
        if (!payment) {
            throw new Error('Payment not found');
        }

        if (payment.status !== PaymentStatus.SUCCEEDED) {
            throw new Error(`Payment cannot be refunded in status: ${payment.status}`);
        }

        const trx = await this.db.transaction();

        try {
            const provider = PaymentProviderFactory.getProvider(payment.provider);
            const startTime = Date.now();

            const result = await provider.refundPayment({
                providerPaymentId: payment.provider_payment_id!,
                amount: request.amount,
                reason: request.reason,
            });

            const latency = Date.now() - startTime;
            paymentProviderLatencyHistogram.observe({ provider: payment.provider, operation: 'refund' }, latency);

            await this.attemptRepo.create({
                paymentId: payment.id,
                status: result.success ? AttemptStatus.SUCCESS : AttemptStatus.FAILURE,
                requestPayload: request,
                responsePayload: result,
                latencyMs: latency,
            });

            const updatedPayment = await this.paymentRepo.update(
                paymentId,
                { status: PaymentStatus.REFUNDED },
                trx
            );

            await this.createOutboxEvent(updatedPayment, trx, OutboxEventType.PAYMENT_REFUNDED);

            await trx.commit();

            logger.info({ paymentId }, 'Payment refunded');

            return updatedPayment;
        } catch (error: any) {
            await trx.rollback();
            logger.error({ paymentId, error: error.message }, 'Payment refund failed');
            throw error;
        }
    }

    private async callProviderWithRetry(
        paymentId: string,
        provider: string,
        params: any
    ): Promise<any> {
        const paymentProvider = PaymentProviderFactory.getProvider(provider);
        let lastError: any = null;

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const startTime = Date.now();
                const result = await paymentProvider.createPayment(params);
                const latency = Date.now() - startTime;

                paymentProviderLatencyHistogram.observe({ provider, operation: 'create' }, latency);
                paymentAttemptsCounter.inc({ provider, status: result.success ? 'success' : 'failure' });

                await this.attemptRepo.create({
                    paymentId,
                    status: result.success ? AttemptStatus.SUCCESS : AttemptStatus.FAILURE,
                    requestPayload: params,
                    responsePayload: result,
                    latencyMs: latency,
                });

                if (result.success || !this.retryService.shouldRetry(attempt + 1)) {
                    return result;
                }

                lastError = new Error(result.failureMessage || 'Provider call failed');
            } catch (error: any) {
                lastError = error;
                paymentAttemptsCounter.inc({ provider, status: 'timeout' });

                await this.attemptRepo.create({
                    paymentId,
                    status: AttemptStatus.TIMEOUT,
                    requestPayload: params,
                    responsePayload: { error: error.message },
                    latencyMs: null,
                });

                logger.warn({ attempt: attempt + 1, error: error.message }, 'Provider call failed');
            }

            if (this.retryService.shouldRetry(attempt + 1)) {
                const delay = this.retryService.calculateDelay(attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        // All retries exhausted
        return {
            success: false,
            providerPaymentId: null,
            status: PaymentStatus.FAILED,
            failureCode: 'max_retries_exceeded',
            failureMessage: lastError?.message || 'Maximum retry attempts exceeded',
        };
    }

    private async createOutboxEvent(
        payment: Payment,
        trx: Knex.Transaction,
        eventType?: OutboxEventType
    ): Promise<void> {
        let type: OutboxEventType;

        if (eventType) {
            type = eventType;
        } else if (payment.status === PaymentStatus.SUCCEEDED) {
            type = OutboxEventType.PAYMENT_COMPLETED;
        } else if (payment.status === PaymentStatus.FAILED) {
            type = OutboxEventType.PAYMENT_FAILED;
        } else {
            return; // Don't create event for other statuses
        }

        await this.outboxRepo.create(
            {
                aggregateType: 'PAYMENT',
                aggregateId: payment.id,
                type,
                payload: {
                    paymentId: payment.id,
                    rideId: payment.ride_id,
                    userId: payment.user_id,
                    amount: payment.amount,
                    currency: payment.currency,
                    status: payment.status,
                    provider: payment.provider,
                    providerPaymentId: payment.provider_payment_id,
                    failureCode: payment.failure_code,
                    failureMessage: payment.failure_message,
                },
            },
            trx
        );
    }

    private mapToResponse(payment: Payment, clientSecret?: string): CreatePaymentResponse {
        return {
            paymentId: payment.id,
            status: payment.status,
            providerPaymentId: payment.provider_payment_id,
            clientSecret,
            requiresAction: payment.status === PaymentStatus.REQUIRES_ACTION,
        };
    }
}
