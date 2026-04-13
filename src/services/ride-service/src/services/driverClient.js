const axios = require('axios');

const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || 'http://driver-service:3004';

const driverClient = axios.create({
    baseURL: DRIVER_SERVICE_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * Get driver location
 */
async function getDriverLocation(driverId) {
    try {
        const response = await driverClient.get(`/drivers/${driverId}/location`);
        return response.data; // Expecting { lat, lng }
    } catch (error) {
        console.warn(`[DriverClient] Failed to fetch location for ${driverId}:`, error.message);
        return null;
    }
}

module.exports = {
    getDriverLocation
};
