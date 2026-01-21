import { publishMessage } from './producer';
import { OutboxEvent } from '../domain/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('EventPublisher');

export class EventPublisher {
    async publishOutboxEvent(event: OutboxEvent): Promise<void> {
        try {
            await publishMessage({
                topic: event.type,
                messages: [
                    {
                        key: event.id, // Use outbox event ID as key for idempotency
                        value: JSON.stringify({
                            eventId: event.id,
                            aggregateType: event.aggregate_type,
                            aggregateId: event.aggregate_id,
                            type: event.type,
                            payload: event.payload,
                            timestamp: event.created_at,
                        }),
                    },
                ],
            });

            logger.info(
                { eventId: event.id, type: event.type },
                'Outbox event published to Kafka'
            );
        } catch (error: any) {
            logger.error(
                { eventId: event.id, error: error.message },
                'Failed to publish outbox event'
            );
            throw error;
        }
    }
}
