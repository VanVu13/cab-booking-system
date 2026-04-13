const axios = require('axios');

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://booking-service:3006';

const bookingClient = axios.create({
    baseURL: BOOKING_SERVICE_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * Get booking details by ID
 */
async function getBooking(bookingId, authUser) {
    try {
        const response = await bookingClient.get(`/${bookingId}`, {
            headers: {
                'x-user-id': authUser
            }
        });
        return response.data;
    } catch (error) {
        console.warn(`[BookingClient] Failed to fetch booking ${bookingId}:`, error.message);
        return null;
    }
}

module.exports = {
    getBooking
};
