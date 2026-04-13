const axios = require('axios');
const { createBreaker } = require('../utils/circuitBreaker');

const PRICING_SERVICE_URL = process.env.PRICING_SERVICE_URL || 'http://pricing-service:3003';
const MOCK_DEPENDENCIES = process.env.MOCK_DEPENDENCIES === 'true';

// Fallback pricing when service is unavailable
function fallbackPricing(pickup, drop, vehicleType) {
    console.warn('[PRICING] Using fallback pricing (circuit open or service down)');
    const basePrices = { SEDAN: 15000, SUV: 20000, BIKE: 5000 };
    return {
        estimatedPrice: (basePrices[vehicleType] || 15000) + 25000,
        currency: 'VND',
        surgeMultiplier: 1.0,
        breakdown: { base: basePrices[vehicleType] || 15000, distance: 25000, time: 0 },
        isFallback: true
    };
}

// Circuit breaker for Pricing Service
const pricingBreaker = createBreaker(
    async (pickup, drop, vehicleType) => {
        const response = await axios.post(`${PRICING_SERVICE_URL}/pricing/estimate`, {
            pickup, drop, vehicleType
        }, { timeout: 3000 });
        return response.data;
    },
    {
        name: 'pricing-service',
        timeout: 5000,
        errorThreshold: 5,
        resetTimeout: 30000,
        fallbackFn: fallbackPricing
    }
);

/**
 * Get price estimate from Pricing Service (with circuit breaker)
 */
async function getPriceEstimate(pickup, drop, vehicleType) {
    if (MOCK_DEPENDENCIES) {
        console.log('[MOCK] Pricing Service: Returning mock price estimate');
        return {
            estimatedPrice: 50000 + Math.floor(Math.random() * 30000),
            currency: 'VND',
            surgeMultiplier: 1.0,
            breakdown: { base: 15000, distance: 25000, time: 10000 }
        };
    }

    return pricingBreaker.fire(pickup, drop, vehicleType);
}

module.exports = { getPriceEstimate };
