const axios = require('axios');
const { logDecision, logMatchFailed, logContextMissing } = require('./decisionLogger');

const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || 'http://driver-service:3004';
const MOCK_DEPENDENCIES = process.env.MOCK_DEPENDENCIES === 'true';

const MODEL_VERSION = 'rule-based-v2';

/**
 * Find nearby available drivers
 * @param {Object} location - { lat, lng }
 * @param {string} vehicleType - SEDAN | SUV | BIKE
 * @param {number} radius - Search radius in meters
 */
async function findNearbyDrivers(location, vehicleType, radius = 5000) {
    // Mock mode - return fake drivers
    if (MOCK_DEPENDENCIES) {
        console.log('[MOCK] Driver Service: Returning mock nearby drivers');

        const mockDrivers = [
            {
                driverId: `driver-${Date.now()}-001`,
                name: 'Mock Driver A',
                vehicleType: vehicleType,
                location: { lat: location.lat + 0.01, lng: location.lng + 0.01 },
                rating: 4.8,
                distanceMeters: 500 + Math.floor(Math.random() * 1000),
                etaSeconds: 180,
                priceMultiplier: 1.0
            },
            {
                driverId: `driver-${Date.now()}-002`,
                name: 'Mock Driver B',
                vehicleType: vehicleType,
                location: { lat: location.lat - 0.01, lng: location.lng + 0.02 },
                rating: 4.5,
                distanceMeters: 800 + Math.floor(Math.random() * 1500),
                etaSeconds: 300,
                priceMultiplier: 1.2
            },
            {
                driverId: `driver-${Date.now()}-003`,
                name: 'Mock Driver C',
                vehicleType: vehicleType,
                location: { lat: location.lat + 0.02, lng: location.lng - 0.01 },
                rating: 4.9,
                distanceMeters: 1200 + Math.floor(Math.random() * 800),
                etaSeconds: 420,
                priceMultiplier: 1.0
            }
        ];

        return mockDrivers;
    }

    // Real mode - call Driver Service
    try {
        console.log(`[MATCHING-DEBUG] Calling Driver Service at ${DRIVER_SERVICE_URL}/drivers/nearby...`);
        const response = await axios.get(`${DRIVER_SERVICE_URL}/drivers/nearby`, {
            params: {
                lat: location.lat,
                lng: location.lng,
                vehicleType: vehicleType,
                radius: radius
            },
            timeout: 10000
        });
        console.log(`[MATCHING-DEBUG] Driver Service responded with ${response.data.drivers?.length || 0} drivers`);
        return response.data.drivers || [];
    } catch (error) {
        console.error('Driver Service error detail:', {
            message: error.message,
            code: error.code,
            url: error.config?.url
        });
        throw new Error('Failed to find nearby drivers');
    }
}

/**
 * Validate ride context before matching
 * Returns list of missing/invalid fields
 */
function validateContext(event) {
    const missing = [];
    if (!event.pickup) missing.push('pickup');
    if (!event.pickup?.lat || !event.pickup?.lng) missing.push('pickup.coordinates');
    if (!event.userId) missing.push('userId');
    if (!event.rideId) missing.push('rideId');
    return missing;
}

/**
 * Multi-factor scoring: Rank drivers and return top-3
 * Scores based on: distance (30%), rating (25%), ETA (30%), price (15%)
 * Falls back to simple distance sort if scoring fails
 */
function rankDrivers(drivers, rideContext = {}) {
    const startTime = Date.now();

    if (!drivers || drivers.length === 0) {
        logMatchFailed(rideContext.rideId, 'NO_CANDIDATES', { model_version: MODEL_VERSION });
        return { topDrivers: [], decision: { reason: 'NO_CANDIDATES', model_version: MODEL_VERSION, fallback: false } };
    }

    try {
        // Calculate normalized scores for each factor
        const maxDist = Math.max(...drivers.map(d => d.distanceMeters || 5000));
        const maxEta = Math.max(...drivers.map(d => d.etaSeconds || 1800));

        const scored = drivers.map(d => {
            // Normalize each factor to 0-1 scale
            const distScore = 1 - ((d.distanceMeters || maxDist) / (maxDist || 1));    // closer = higher
            const ratingScore = (d.rating || 3.0) / 5.0;                                // higher = better
            const etaScore = d.etaSeconds ? 1 - (d.etaSeconds / (maxEta || 1)) : distScore;  // lower ETA = better
            const priceScore = d.priceMultiplier ? Math.max(0, 1 - (d.priceMultiplier - 1)) : 1; // lower surge = better

            // Weighted composite score
            const WEIGHTS = { distance: 0.30, rating: 0.25, eta: 0.30, price: 0.15 };
            const totalScore = (distScore * WEIGHTS.distance)
                + (ratingScore * WEIGHTS.rating)
                + (etaScore * WEIGHTS.eta)
                + (priceScore * WEIGHTS.price);

            return {
                ...d,
                score: totalScore,
                breakdown: { distScore: +distScore.toFixed(3), ratingScore: +ratingScore.toFixed(3), etaScore: +etaScore.toFixed(3), priceScore: +priceScore.toFixed(3) }
            };
        });

        scored.sort((a, b) => b.score - a.score);
        const topDrivers = scored.slice(0, 3);

        const decision = {
            reason: 'MULTI_FACTOR_RANKING',
            model_version: MODEL_VERSION,
            fallback: false,
            candidatesTotal: drivers.length,
            selectedDriverId: topDrivers[0]?.driverId,
            topScores: topDrivers.map(d => ({
                driverId: d.driverId,
                score: +d.score.toFixed(3),
                breakdown: d.breakdown
            })),
            processingTimeMs: Date.now() - startTime
        };

        logDecision(rideContext.rideId, decision);
        return { topDrivers, decision };

    } catch (scoringError) {
        // Fallback: simple distance sort if scoring fails
        console.error('[MATCHING] Scoring engine failed, using fallback:', scoringError.message);
        const fallbackSorted = [...drivers].sort((a, b) => (a.distanceMeters || 9999) - (b.distanceMeters || 9999));
        const topDrivers = fallbackSorted.slice(0, 3);

        const decision = {
            reason: 'FALLBACK_DISTANCE_SORT',
            model_version: MODEL_VERSION,
            fallback: true,
            candidatesTotal: drivers.length,
            selectedDriverId: topDrivers[0]?.driverId,
            topScores: topDrivers.map(d => ({ driverId: d.driverId, distance: d.distanceMeters })),
            fallbackReason: scoringError.message,
            processingTimeMs: Date.now() - startTime
        };

        logDecision(rideContext.rideId, decision);
        return { topDrivers, decision };
    }
}

/**
 * Legacy compatibility: select single best driver
 * Now delegates to rankDrivers and picks top-1
 */
function selectBestDriver(drivers, rideContext = {}) {
    const { topDrivers } = rankDrivers(drivers, rideContext);
    return topDrivers.length > 0 ? topDrivers[0] : null;
}

module.exports = { findNearbyDrivers, selectBestDriver, rankDrivers, validateContext };
