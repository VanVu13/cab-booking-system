const axios = require('axios');

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://booking-service:3006';
const MOCK_DEPENDENCIES = process.env.MOCK_DEPENDENCIES === 'true';

/**
 * Get booking details by ID
 * @param {string} bookingId
 * @returns {Promise<Object>}
 */
async function getBooking(bookingId) {
    if (MOCK_DEPENDENCIES) {
        console.log(`[MOCK] Booking Service: Returning mock booking ${bookingId}`);
        return {
            bookingId: bookingId,
            status: 'PROPOSED',
            pickup: { lat: 10.7769, lng: 106.7009 },
            userId: 'mock-user-123'
        };
    }

    try {
        const response = await axios.get(`${BOOKING_SERVICE_URL}/bookings/${bookingId}`, {
            headers: {
                'x-user-id': 'SYSTEM_TRACKING' // Allowed to view any booking
            },
            timeout: 5000
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return null;
        }
        console.error(`[BookingClient] Failed to get booking ${bookingId}:`, error.message);
        return null;
    }
}

module.exports = { getBooking };
