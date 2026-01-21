import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { WebhookEvent } from '../domain/types';
import getDb from '../utils/db';

export class WebhookRepository {
    private db: Knex;

    constructor() {
        this.db = getDb();
    }

    async create(event: {
        provider: string;
        eventId: string;
        signatureValid: boolean;
        payload: any;
    }): Promise<WebhookEvent | null> {
        try {
            const [created] = await this.db('webhook_events')
                .insert({
                    id: uuidv4(),
                    provider: event.provider,
                    event_id: event.eventId,
                    signature_valid: event.signatureValid,
                    payload: JSON.stringify(event.payload),
                    created_at: new Date(),
                })
                .returning('*');

            return {
                ...created,
                payload: typeof created.payload === 'string' ? JSON.parse(created.payload) : created.payload,
            };
        } catch (error: any) {
            // Unique constraint violation - event already processed
            if (error.code === '23505') {
                return null;
            }
            throw error;
        }
    }

    async findByProviderAndEventId(provider: string, eventId: string): Promise<WebhookEvent | null> {
        const event = await this.db('webhook_events')
            .where({ provider, event_id: eventId })
            .first();

        if (!event) return null;

        return {
            ...event,
            payload: typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload,
        };
    }

    async markAsProcessed(id: string): Promise<void> {
        await this.db('webhook_events')
            .where({ id })
            .update({ processed_at: new Date() });
    }
}
