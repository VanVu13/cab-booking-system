export enum PaymentStatus {
    INITIATED = 'INITIATED',
    PENDING = 'PENDING',
    SUCCEEDED = 'SUCCEEDED',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED',
    CANCELED = 'CANCELED',
    REQUIRES_ACTION = 'REQUIRES_ACTION',
}

export enum PaymentMethod {
    CARD = 'card',
    BANK_TRANSFER = 'bank_transfer',
    E_WALLET = 'e_wallet',
}

export enum PaymentProvider {
    STRIPE = 'stripe',
    ZALOPAY = 'zalopay',
}

export enum AttemptStatus {
    SENT = 'SENT',
    TIMEOUT = 'TIMEOUT',
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
}

export enum OutboxStatus {
    PENDING = 'PENDING',
    PUBLISHED = 'PUBLISHED',
    FAILED = 'FAILED',
}

export enum OutboxEventType {
    PAYMENT_COMPLETED = 'payment.completed',
    PAYMENT_FAILED = 'payment.failed',
    PAYMENT_REFUNDED = 'payment.refunded',
}

export interface Payment {
    id: string;
    ride_id: string;
    user_id: string;
    amount: number;
    currency: string;
    method: string;
    provider: string;
    provider_payment_id: string | null;
    status: PaymentStatus;
    failure_code: string | null;
    failure_message: string | null;
    idempotency_key: string;
    attempt_count: number;
    created_at: Date;
    updated_at: Date;
}

export interface PaymentAttempt {
    id: string;
    payment_id: string;
    status: AttemptStatus;
    request_payload: any;
    response_payload: any;
    latency_ms: number | null;
    created_at: Date;
}

export interface WebhookEvent {
    id: string;
    provider: string;
    event_id: string;
    signature_valid: boolean;
    payload: any;
    processed_at: Date | null;
    created_at: Date;
}

export interface OutboxEvent {
    id: string;
    aggregate_type: string;
    aggregate_id: string;
    type: string;
    payload: any;
    status: OutboxStatus;
    created_at: Date;
    published_at: Date | null;
}

// DTOs
export interface CreatePaymentRequest {
    rideId: string;
    userId: string;
    amount: number;
    currency: string;
    method: PaymentMethod;
    provider: PaymentProvider;
    metadata?: any;
}

export interface CreatePaymentResponse {
    paymentId: string;
    status: PaymentStatus;
    providerPaymentId: string | null;
    clientSecret?: string;
    requiresAction: boolean;
}

export interface ConfirmPaymentRequest {
    paymentMethodId?: string;
    metadata?: any;
}

export interface RefundPaymentRequest {
    reason?: string;
    amount?: number;
}

export interface PaymentProviderResponse {
    success: boolean;
    providerPaymentId: string | null;
    status: PaymentStatus;
    clientSecret?: string;
    requiresAction?: boolean;
    failureCode?: string;
    failureMessage?: string;
    metadata?: any;
}
