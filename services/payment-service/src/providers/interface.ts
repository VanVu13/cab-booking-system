import { PaymentProviderResponse } from '../domain/types';

export interface IPaymentProvider {
    /**
     * Create a payment with the provider
     */
    createPayment(params: {
        amount: number;
        currency: string;
        metadata?: any;
    }): Promise<PaymentProviderResponse>;

    /**
     * Confirm a payment (for 3DS or similar flows)
     */
    confirmPayment(params: {
        providerPaymentId: string;
        paymentMethodId?: string;
    }): Promise<PaymentProviderResponse>;

    /**
     * Refund a payment
     */
    refundPayment(params: {
        providerPaymentId: string;
        amount?: number;
        reason?: string;
    }): Promise<PaymentProviderResponse>;

    /**
     * Verify webhook signature and return event data
     */
    verifyWebhook(params: {
        payload: string | Buffer;
        signature: string;
    }): Promise<{
        valid: boolean;
        event?: any;
    }>;
}
