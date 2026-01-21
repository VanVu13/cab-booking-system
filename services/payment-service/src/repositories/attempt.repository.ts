import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { PaymentAttempt, AttemptStatus } from '../domain/types';
import getDb from '../utils/db';

export class AttemptRepository {
    private db: Knex;

    constructor() {
        this.db = getDb();
    }

    async create(attempt: {
        paymentId: string;
        status: AttemptStatus;
        requestPayload?: any;
        responsePayload?: any;
        latencyMs?: number;
    }): Promise<PaymentAttempt> {
        const [created] = await this.db('payment_attempts')
            .insert({
                id: uuidv4(),
                payment_id: attempt.paymentId,
                status: attempt.status,
                request_payload: attempt.requestPayload ? JSON.stringify(attempt.requestPayload) : null,
                response_payload: attempt.responsePayload ? JSON.stringify(attempt.responsePayload) : null,
                latency_ms: attempt.latencyMs || null,
                created_at: new Date(),
            })
            .returning('*');

        return {
            ...created,
            request_payload: created.request_payload ? JSON.parse(created.request_payload) : null,
            response_payload: created.response_payload ? JSON.parse(created.response_payload) : null,
        };
    }

    async findByPaymentId(paymentId: string): Promise<PaymentAttempt[]> {
        const attempts = await this.db('payment_attempts')
            .where({ payment_id: paymentId })
            .orderBy('created_at', 'desc');

        return attempts.map(attempt => ({
            ...attempt,
            request_payload: attempt.request_payload ? JSON.parse(attempt.request_payload) : null,
            response_payload: attempt.response_payload ? JSON.parse(attempt.response_payload) : null,
        }));
    }
}
