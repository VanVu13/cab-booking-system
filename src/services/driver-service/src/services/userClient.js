const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';

const userClient = axios.create({
    baseURL: USER_SERVICE_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * Get user profile by ID and Role
 */
async function getUserProfile(userId, role) {
    try {
        console.log(`[DriverService-UserClient] Fetching ${role} profile for ${userId} from ${USER_SERVICE_URL}`);
        const response = await userClient.get('/profile', {
            headers: {
                'x-user-id': userId,
                'x-user-role': role
            }
        });
        return response.data;
    } catch (error) {
        console.warn(`[DriverService-UserClient] Failed to fetch profile for ${userId}:`, error.message);
        return null;
    }
}

module.exports = {
    getUserProfile
};
