import { OutboxRepository } from '../repositories/outbox.repository';
import { EventPublisher } from '../kafka/publisher';
import { createLogger } from '../utils/logger';
import { outboxEventsPublishedCounter, outboxEventsFailedCounter } from '../utils/metrics';

const logger = createLogger('OutboxWorker');

export class OutboxWorker {
    private outboxRepo: OutboxRepository;
    private eventPublisher: EventPublisher;
    private pollInterval: number;
    private batchSize: number;
    private isRunning: boolean = false;
    private intervalId: NodeJS.Timeout | null = null;

    constructor() {
        this.outboxRepo = new OutboxRepository();
        this.eventPublisher = new EventPublisher();
        this.pollInterval = parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '1000');
        this.batchSize = parseInt(process.env.OUTBOX_BATCH_SIZE || '10');
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('Outbox worker already running');
            return;
        }

        this.isRunning = true;
        logger.info({ pollInterval: this.pollInterval }, 'Starting outbox worker');

        // Run immediately
        await this.processOutboxEvents();

        // Then run on interval
        this.intervalId = setInterval(async () => {
            await this.processOutboxEvents();
        }, this.pollInterval);
    }

    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        logger.info('Stopping outbox worker');
        this.isRunning = false;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private async processOutboxEvents(): Promise<void> {
        try {
            const pendingEvents = await this.outboxRepo.findPending(this.batchSize);

            if (pendingEvents.length === 0) {
                return;
            }

            logger.info({ count: pendingEvents.length }, 'Processing outbox events');

            for (const event of pendingEvents) {
                try {
                    // Publish to Kafka
                    await this.eventPublisher.publishOutboxEvent(event);

                    // Mark as published
                    await this.outboxRepo.markAsPublished(event.id);

                    outboxEventsPublishedCounter.inc({ event_type: event.type });

                    logger.info({ eventId: event.id, type: event.type }, 'Outbox event published');
                } catch (error: any) {
                    logger.error(
                        { eventId: event.id, error: error.message },
                        'Failed to publish outbox event'
                    );

                    // Mark as failed (could implement retry logic here)
                    await this.outboxRepo.markAsFailed(event.id);
                    outboxEventsFailedCounter.inc();
                }
            }
        } catch (error: any) {
            logger.error({ error: error.message }, 'Error processing outbox events');
        }
    }
}
