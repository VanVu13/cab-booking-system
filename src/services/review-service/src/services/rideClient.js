const RIDE_SERVICE_URL = process.env.RIDE_SERVICE_URL || 'http://ride-service:3007';

/**
 * Fetch ride details from Ride Service including participants and status
 * @param {string} rideId 
 * @param {string} userId - Context user ID
 * @returns {Promise<Object>} Ride object or null if not found
 */
async function getRide(rideId, userId) {
    try {
        const url = `${RIDE_SERVICE_URL}/${rideId}`;
        console.log(`[Review Service] Verifying ride: ${url} (User: ${userId})`);

        const response = await fetch(url, {
            headers: { 'x-user-id': userId }
        });

        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`Ride Service returned ${response.status}: ${response.statusText}`);
        }

        const ride = await response.json();
        return ride;
    } catch (error) {
        console.error(`[Review Service] Failed to verify ride ${rideId}:`, error.message);
        throw error; // Propagate error to controller
    }
}

module.exports = { getRide };
