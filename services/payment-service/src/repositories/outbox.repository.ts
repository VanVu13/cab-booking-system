import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { OutboxEvent, OutboxStatus, OutboxEventType } from '../domain/types';
import getDb from '../utils/db';

export class OutboxRepository {
    private db: Knex;

    constructor() {
        this.db = getDb();
    }

    async create(
        event: {
            aggregateType: string;
            aggregateId: string;
            type: OutboxEventType;
            payload: any;
        },
        trx?: Knex.Transaction
    ): Promise<OutboxEvent> {
        const db = trx || this.db;
        const [created] = await db('outbox_events')
            .insert({
                id: uuidv4(),
                aggregate_type: event.aggregateType,
                aggregate_id: event.aggregateId,
                type: event.type,
                payload: JSON.stringify(event.payload),
                status: OutboxStatus.PENDING,
                created_at: new Date(),
            })
            .returning('*');

        return {
            ...created,
            payload: typeof created.payload === 'string' ? JSON.parse(created.payload) : created.payload,
        };
    }

    async findPending(limit: number = 10): Promise<OutboxEvent[]> {
        const events = await this.db('outbox_events')
            .where({ status: OutboxStatus.PENDING })
            .orderBy('created_at', 'asc')
            .limit(limit);

        return events.map(event => ({
            ...event,
            payload: typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload,
        }));
    }

    async markAsPublished(id: string, trx?: Knex.Transaction): Promise<void> {
        const db = trx || this.db;
        await db('outbox_events')
            .where({ id })
            .update({
                status: OutboxStatus.PUBLISHED,
                published_at: new Date(),
            });
    }

    async markAsFailed(id: string, trx?: Knex.Transaction): Promise<void> {
        const db = trx || this.db;
        await db('outbox_events')
            .where({ id })
            .update({
                status: OutboxStatus.FAILED,
            });
    }
}
