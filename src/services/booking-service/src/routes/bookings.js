const express = require('express');
const router = express.Router();
const {
    createBooking,
    getBookingById,
    getBookingsByUser,
    cancelBooking
} = require('../controllers/bookingController');

// POST /bookings - Create new booking
router.post('/', createBooking);

// GET /bookings?userId=xxx - Get bookings by user
router.get('/', getBookingsByUser);

// GET /bookings/:id - Get booking by ID
router.get('/:id', getBookingById);

// DELETE /bookings/:id - Cancel booking
router.delete('/:id', cancelBooking);

module.exports = router;
