const axios = require('axios');

const RIDE_SERVICE_URL = process.env.RIDE_SERVICE_URL || 'http://ride-service:3007';
const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || 'http://driver-service:3004';
const ETA_SERVICE_URL = process.env.ETA_SERVICE_URL || 'http://eta-service:3012';

async function getRideDetails(rideId) {
    try {
        const url = `${RIDE_SERVICE_URL}/rides/${rideId}`;
        console.log(`[InternalClient] Fetching ride details from: ${url}`);

        const response = await axios.get(url, {
            headers: { 'x-user-id': 'SYSTEM_TRACKING' }
        });
        return response.data;
    } catch (error) {
        const status = error.response?.status;
        console.error(`[InternalClient] Error fetching ride ${rideId} from ${RIDE_SERVICE_URL}:`, status || error.message);
        if (status === 403) {
            console.error(`[InternalClient] 403 Forbidden - Check SYSTEM_TRACKING bypass in ride-service`);
        }
        return null;
    }
}

async function getDriverLocation(driverId) {
    try {
        const url = `${DRIVER_SERVICE_URL}/drivers/${driverId}/location`;
        const response = await axios.get(url, {
            headers: { 'x-user-id': 'SYSTEM_TRACKING' }
        });
        return response.data;
    } catch (error) {
        console.error(`[InternalClient] Error fetching driver ${driverId} location:`, error.response?.status || error.message);
        return null;
    }
}

/**
 * Get route + ETA data from ETA Service
 * Replaces direct OSRM calls - ETA Service handles routing, fallback, and traffic
 */
async function getETARoute(start, end) {
    try {
        const response = await axios.post(`${ETA_SERVICE_URL}/eta/route`, {
            start, end
        }, { timeout: 8000 });

        const { distanceMeters, durationSeconds, points, source } = response.data;
        console.log(`[InternalClient] ETA route: ${points?.length || 0} points, Dist: ${distanceMeters}m, Dur: ${durationSeconds}s (${source})`);

        return {
            points: points || [],
            distance: distanceMeters || 0,
            duration: durationSeconds || 0
        };
    } catch (error) {
        console.error('[InternalClient] ETA Service error:', error.message);
        return { points: [], distance: 0, duration: 0 };
    }
}

module.exports = { getRideDetails, getDriverLocation, getETARoute };
