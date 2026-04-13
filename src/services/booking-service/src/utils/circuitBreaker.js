/**
 * Circuit Breaker - Wraps service calls with circuit breaker pattern
 * Uses a lightweight implementation (no external dependency needed)
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests are rejected immediately with fallback
 * - HALF_OPEN: After reset timeout, allow one test request
 */

class CircuitBreaker {
    constructor(fn, options = {}) {
        this.fn = fn;
        this.name = options.name || 'unknown';
        this.timeout = options.timeout || 5000;
        this.errorThreshold = options.errorThreshold || 5;       // failures before opening
        this.resetTimeout = options.resetTimeout || 30000;        // ms before trying half-open
        this.fallbackFn = options.fallbackFn || null;

        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.successCount = 0;
    }

    async fire(...args) {
        if (this.state === 'OPEN') {
            // Check if reset timeout has passed
            if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
                this.state = 'HALF_OPEN';
                console.info(`[CIRCUIT] ${this.name}: HALF_OPEN - Testing with one request`);
            } else {
                // Circuit is open → use fallback
                console.warn(`[CIRCUIT] ${this.name}: OPEN - Request rejected`);
                if (this.fallbackFn) {
                    return this.fallbackFn(...args);
                }
                throw new Error(`Circuit breaker OPEN for: ${this.name}`);
            }
        }

        try {
            // Wrap call with timeout
            const result = await Promise.race([
                this.fn(...args),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Timeout: ${this.name}`)), this.timeout)
                )
            ]);

            this._onSuccess();
            return result;
        } catch (error) {
            this._onFailure();

            // Use fallback if available
            if (this.fallbackFn) {
                console.warn(`[CIRCUIT] ${this.name}: Using fallback after error: ${error.message}`);
                return this.fallbackFn(...args);
            }
            throw error;
        }
    }

    _onSuccess() {
        this.failureCount = 0;
        if (this.state === 'HALF_OPEN') {
            this.state = 'CLOSED';
            console.info(`[CIRCUIT] ${this.name}: CLOSED - Service recovered`);
        }
        this.successCount++;
    }

    _onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.errorThreshold) {
            this.state = 'OPEN';
            console.warn(`[CIRCUIT] ${this.name}: OPEN - ${this.failureCount} failures reached threshold`);
        }
    }

    getState() {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount
        };
    }
}

/**
 * Factory function to create a circuit breaker
 */
function createBreaker(fn, options = {}) {
    return new CircuitBreaker(fn, options);
}

module.exports = { CircuitBreaker, createBreaker };
