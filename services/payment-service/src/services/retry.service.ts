import { createLogger } from '../utils/logger';

const logger = createLogger('RetryService');

export class RetryService {
    private baseDelayMs: number;
    private maxAttempts: number;

    constructor() {
        this.baseDelayMs = parseInt(process.env.RETRY_BASE_DELAY_MS || '1000');
        this.maxAttempts = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');
    }

    /**
     * Calculate exponential backoff delay with jitter
     * Pattern: 1s, 2s, 4s with random jitter
     */
    calculateDelay(attemptNumber: number): number {
        if (attemptNumber >= this.maxAttempts) {
            return 0;
        }

        // Exponential: 2^attemptNumber * baseDelay
        const exponentialDelay = Math.pow(2, attemptNumber) * this.baseDelayMs;

        // Add jitter: random value between 0 and 20% of delay
        const jitter = Math.random() * exponentialDelay * 0.2;

        const totalDelay = exponentialDelay + jitter;

        logger.info(
            { attemptNumber, delay: totalDelay },
            'Calculated retry delay'
        );

        return totalDelay;
    }

    shouldRetry(attemptCount: number): boolean {
        return attemptCount < this.maxAttempts;
    }

    async executeWithRetry<T>(
        operation: () => Promise<T>,
        attemptNumber: number = 0
    ): Promise<T> {
        try {
            return await operation();
        } catch (error: any) {
            if (this.shouldRetry(attemptNumber + 1)) {
                const delay = this.calculateDelay(attemptNumber);

                logger.warn(
                    { attemptNumber: attemptNumber + 1, delay, error: error.message },
                    'Retrying operation after delay'
                );

                await this.sleep(delay);
                return this.executeWithRetry(operation, attemptNumber + 1);
            }

            logger.error(
                { attemptNumber: attemptNumber + 1, error: error.message },
                'Max retry attempts reached'
            );
            throw error;
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
