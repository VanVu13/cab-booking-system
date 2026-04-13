const axios = require('axios');

/**
 * Calculate straight-line distance using Haversine formula
 * Used as fallback when OSRM is unavailable
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

/**
 * Get traffic multiplier based on time of day (Vietnam timezone UTC+7)
 * Simulates traffic conditions for more realistic ETA
 */
function getTrafficMultiplier() {
    const now = new Date();
    // Convert to Vietnam timezone (UTC+7)
    const vietnamHour = (now.getUTCHours() + 7) % 24;

    // Rush hours: 7-9 AM and 5-7 PM
    if ((vietnamHour >= 7 && vietnamHour <= 9) || (vietnamHour >= 17 && vietnamHour <= 19)) {
        return 1.5; // 50% longer during rush hour
    }
    // Late night: 10 PM - 5 AM (less traffic)
    if (vietnamHour >= 22 || vietnamHour <= 5) {
        return 0.85;
    }
    // Normal hours
    return 1.0;
}

/**
 * Get real route data from OSRM (Open Source Routing Machine)
 * Returns route with distance, duration and polyline points
 */
async function getOSRMRoute(start, end) {
    try {
        const url = `http://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
        const response = await axios.get(url, { timeout: 5000 });

        if (response.data.routes && response.data.routes.length > 0) {
            const route = response.data.routes[0];
            const points = route.geometry.coordinates.map(coord => ({
                lat: coord[1],
                lng: coord[0]
            }));

            console.log(`[ETA-OSRM] Route: ${points.length} points, Dist: ${route.distance}m, Dur: ${route.duration}s`);

            return {
                points,
                distance: route.distance, // meters
                duration: route.duration  // seconds
            };
        }
        return { points: [], distance: 0, duration: 0 };
    } catch (error) {
        console.error('[ETA-OSRM] Routing Error:', error.message);
        return null; // Return null to trigger fallback
    }
}

/**
 * Calculate ETA estimate between two points
 * Uses OSRM for accurate routing, falls back to Haversine + average speed
 *
 * @param {Object} pickup - { lat, lng }
 * @param {Object} drop - { lat, lng }
 * @returns {Object} { distanceMeters, durationSeconds, pickupEtaSeconds, points, source }
 */
async function calculateETA(pickup, drop) {
    const trafficMultiplier = getTrafficMultiplier();

    // Try OSRM first
    const routeData = await getOSRMRoute(pickup, drop);

    if (routeData && routeData.distance > 0) {
        const adjustedDuration = Math.round(routeData.duration * trafficMultiplier);

        return {
            distanceMeters: routeData.distance,
            durationSeconds: adjustedDuration,
            pickupEtaSeconds: Math.round(adjustedDuration * 1.2), // Buffer for pickup
            points: routeData.points,
            trafficMultiplier,
            source: 'OSRM'
        };
    }

    // Fallback: Haversine + average speed
    console.warn('[ETA] OSRM unavailable, using Haversine fallback');
    const distance = calculateHaversineDistance(pickup.lat, pickup.lng, drop.lat, drop.lng);
    const avgSpeedMPS = 30 * 1000 / 3600; // 30 km/h in m/s
    const duration = Math.round((distance / avgSpeedMPS) * trafficMultiplier);

    return {
        distanceMeters: distance,
        durationSeconds: duration,
        pickupEtaSeconds: Math.round(duration * 1.2),
        points: [
            { lat: pickup.lat, lng: pickup.lng },
            { lat: drop.lat, lng: drop.lng }
        ],
        trafficMultiplier,
        source: 'HAVERSINE'
    };
}

/**
 * Calculate pickup ETA (driver location → pickup point)
 *
 * @param {Object} driverLocation - { lat, lng }
 * @param {Object} pickup - { lat, lng }
 * @returns {Object} ETA result
 */
async function calculatePickupETA(driverLocation, pickup) {
    return calculateETA(driverLocation, pickup);
}

module.exports = {
    calculateETA,
    calculatePickupETA,
    getOSRMRoute,
    calculateHaversineDistance,
    getTrafficMultiplier
};
