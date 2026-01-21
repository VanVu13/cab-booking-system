import { IPaymentProvider } from './interface';
import { PaymentProviderResponse, PaymentStatus } from '../domain/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('ZaloPayAdapter');

export class ZaloPayAdapter implements IPaymentProvider {
    private appId: string;
    private key: string;
    private endpoint: string;

    constructor() {
        this.appId = process.env.ZALOPAY_APP_ID || '2553';
        this.key = process.env.ZALOPAY_KEY || 'stub_key_12345';
        this.endpoint = process.env.ZALOPAY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2/create';
    }

    async createPayment(params: {
        amount: number;
        currency: string;
        metadata?: any;
    }): Promise<PaymentProviderResponse> {
        try {
            // Stub implementation - simulates ZaloPay API call
            logger.info({ amount: params.amount }, 'ZaloPay payment stub called');

            // Simulate network delay
            await this.delay(100);

            // Simulate 90% success rate
            const success = Math.random() > 0.1;

            if (success) {
                const mockOrderId = `ZP${Date.now()}${Math.floor(Math.random() * 1000)}`;

                return {
                    success: true,
                    providerPaymentId: mockOrderId,
                    status: PaymentStatus.PENDING,
                    metadata: {
                        zpTransToken: `token_${mockOrderId}`,
                        orderUrl: `https://zalopay.vn/pay/${mockOrderId}`,
                    },
                };
            } else {
                return {
                    success: false,
                    providerPaymentId: null,
                    status: PaymentStatus.FAILED,
                    failureCode: 'zalopay_error',
                    failureMessage: 'ZaloPay stub simulated failure',
                };
            }
        } catch (error: any) {
            logger.error({ error: error.message }, 'ZaloPay payment stub error');
            return {
                success: false,
                providerPaymentId: null,
                status: PaymentStatus.FAILED,
                failureCode: 'zalopay_error',
                failureMessage: error.message,
            };
        }
    }

    async confirmPayment(params: {
        providerPaymentId: string;
        paymentMethodId?: string;
    }): Promise<PaymentProviderResponse> {
        try {
            logger.info({ orderId: params.providerPaymentId }, 'ZaloPay confirm stub called');

            await this.delay(100);

            // Simulate success
            return {
                success: true,
                providerPaymentId: params.providerPaymentId,
                status: PaymentStatus.SUCCEEDED,
            };
        } catch (error: any) {
            logger.error({ error: error.message }, 'ZaloPay confirm stub error');
            return {
                success: false,
                providerPaymentId: params.providerPaymentId,
                status: PaymentStatus.FAILED,
                failureCode: 'zalopay_error',
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
            logger.info({ orderId: params.providerPaymentId }, 'ZaloPay refund stub called');

            await this.delay(100);

            const refundId = `RF${Date.now()}`;

            return {
                success: true,
                providerPaymentId: refundId,
                status: PaymentStatus.REFUNDED,
            };
        } catch (error: any) {
            logger.error({ error: error.message }, 'ZaloPay refund stub error');
            return {
                success: false,
                providerPaymentId: null,
                status: PaymentStatus.FAILED,
                failureCode: 'zalopay_error',
                failureMessage: error.message,
            };
        }
    }

    async verifyWebhook(params: {
        payload: string | Buffer;
        signature: string;
    }): Promise<{ valid: boolean; event?: any }> {
        try {
            // Stub verification - in production, verify HMAC signature
            logger.info('ZaloPay webhook stub verification');

            const payloadStr = typeof params.payload === 'string' ? params.payload : params.payload.toString();
            const data = JSON.parse(payloadStr);

            // Simple stub validation - check if signature is not empty
            const valid = params.signature.length > 0;

            if (valid) {
                return {
                    valid: true,
                    event: {
                        type: data.type || 'payment.success',
                        data: data,
                    },
                };
            }

            return { valid: false };
        } catch (error: any) {
            logger.error({ error: error.message }, 'ZaloPay webhook stub verification error');
            return { valid: false };
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
