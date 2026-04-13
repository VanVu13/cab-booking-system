const axios = require('axios');
const { createBreaker } = require('../utils/circuitBreaker');

const ETA_SERVICE_URL = process.env.ETA_SERVICE_URL || 'http://eta-service:3012';

/**
 * Haversine distance formula (fallback)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

// Fallback ETA using Haversine when service is down
function fallbackEta(pickup, drop) {
    console.warn('[ETA] Using fallback Haversine ETA (circuit open or service down)');
    const tripDistance = calculateDistance(pickup.lat, pickup.lng, drop.lat, drop.lng);
    const avgSpeed = 30 * 1000 / 3600; // 30km/h in m/s
    const duration = Math.round(tripDistance / avgSpeed);
    return {
        pickupEtaSeconds: 300,
        tripEtaSeconds: duration,
        tripDistanceMeters: tripDistance,
        isFallback: true
    };
}

// Circuit breaker for ETA Service
const etaBreaker = createBreaker(
    async (pickup, drop) => {
        const response = await axios.post(`${ETA_SERVICE_URL}/eta/estimate`, { pickup, drop }, { timeout: 5000 });
        const { distanceMeters, durationSeconds, pickupEtaSeconds } = response.data;
        console.log(`[EtaClient] Fetched from ETA Service: Dist=${distanceMeters}m, Dur=${durationSeconds}s`);
        return {
            pickupEtaSeconds: pickupEtaSeconds || Math.round(durationSeconds * 1.1),
            tripEtaSeconds: durationSeconds,
            tripDistanceMeters: distanceMeters
        };
    },
    {
        name: 'eta-service',
        timeout: 8000,
        errorThreshold: 5,
        resetTimeout: 30000,
        fallbackFn: fallbackEta
    }
);

/**
 * Get ETA estimate from ETA Service (with circuit breaker)
 */
async function getEtaEstimate(pickup, drop) {
    return etaBreaker.fire(pickup, drop);
}

module.exports = { getEtaEstimate };
