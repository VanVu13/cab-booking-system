import { IPaymentProvider } from './interface';
import { StripeAdapter } from './stripe.adapter';
import { ZaloPayAdapter } from './zalopay.adapter';
import { PaymentProvider } from '../domain/types';

export class PaymentProviderFactory {
    private static providers: Map<string, IPaymentProvider> = new Map();

    static getProvider(provider: PaymentProvider | string): IPaymentProvider {
        const providerKey = provider.toLowerCase();

        if (!this.providers.has(providerKey)) {
            switch (providerKey) {
                case PaymentProvider.STRIPE:
                    this.providers.set(providerKey, new StripeAdapter());
                    break;
                case PaymentProvider.ZALOPAY:
                    this.providers.set(providerKey, new ZaloPayAdapter());
                    break;
                default:
                    throw new Error(`Unsupported payment provider: ${provider}`);
            }
        }

        return this.providers.get(providerKey)!;
    }
}
