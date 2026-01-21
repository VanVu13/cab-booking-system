import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { Payment, PaymentStatus } from '../domain/types';
import getDb from '../utils/db';

export class PaymentRepository {
    private db: Knex;

    constructor() {
        this.db = getDb();
    }

    async create(
        payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>,
        trx?: Knex.Transaction
    ): Promise<Payment> {
        const db = trx || this.db;
        const [created] = await db('payments')
            .insert({
                id: uuidv4(),
                ...payment,
                created_at: new Date(),
                updated_at: new Date(),
            })
            .returning('*');
        return created;
    }

    async findById(id: string): Promise<Payment | null> {
        const payment = await this.db('payments').where({ id }).first();
        return payment || null;
    }

    async findByRideId(rideId: string): Promise<Payment | null> {
        const payment = await this.db('payments').where({ ride_id: rideId }).first();
        return payment || null;
    }

    async findByIdempotencyKey(key: string): Promise<Payment | null> {
        const payment = await this.db('payments').where({ idempotency_key: key }).first();
        return payment || null;
    }

    async update(
        id: string,
        updates: Partial<Payment>,
        trx?: Knex.Transaction
    ): Promise<Payment> {
        const db = trx || this.db;
        const [updated] = await db('payments')
            .where({ id })
            .update({
                ...updates,
                updated_at: new Date(),
            })
            .returning('*');
        return updated;
    }

    async updateStatus(
        id: string,
        status: PaymentStatus,
        additionalUpdates?: Partial<Payment>,
        trx?: Knex.Transaction
    ): Promise<Payment> {
        return this.update(id, { status, ...additionalUpdates }, trx);
    }

    async incrementAttemptCount(id: string, trx?: Knex.Transaction): Promise<void> {
        const db = trx || this.db;
        await db('payments')
            .where({ id })
            .increment('attempt_count', 1)
            .update({ updated_at: new Date() });
    }

    async findPendingRetries(maxAttempts: number): Promise<Payment[]> {
        return this.db('payments')
            .where({ status: PaymentStatus.PENDING })
            .where('attempt_count', '<', maxAttempts)
            .orderBy('created_at', 'asc');
    }
}
