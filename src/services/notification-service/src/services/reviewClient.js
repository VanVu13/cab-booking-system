const axios = require('axios');

const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL || 'http://review-service:3010';

const reviewClient = axios.create({
    baseURL: REVIEW_SERVICE_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * Get average rating for a driver
 */
async function getDriverRating(driverId) {
    try {
        const response = await reviewClient.get(`/driver/${driverId}`);
        if (response.data && response.data.averageRating !== undefined) {
            return response.data.averageRating;
        }
        return '5.0'; // Default if not found but request succeeds
    } catch (error) {
        console.warn(`[ReviewClient] Failed to fetch rating for driver ${driverId}:`, error.message);
        return '5.0'; // Default fallback
    }
}

module.exports = {
    getDriverRating
};
