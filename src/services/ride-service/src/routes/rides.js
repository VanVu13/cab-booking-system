const express = require('express');
const router = express.Router();
const {
    acceptRide,
    rejectRide,
    driverCancelRide,
    arriveRide,
    startRide,
    completeRide,
    getRideById,
    getDriverStats,
    getDriverHistory
} = require('../controllers/rideController');

// GET /rides/driver/stats - Get driver earnings & trip stats (MUST be before /:id)
router.get('/driver/stats', getDriverStats);

// GET /rides/driver/history - Get driver completed ride history (MUST be before /:id)
router.get('/driver/history', getDriverHistory);

// POST /rides/:id/accept - Driver accepts ride
router.post('/:id/accept', acceptRide);

// POST /rides/:id/reject - Driver rejects ride
router.post('/:id/reject', rejectRide);

// POST /rides/:id/cancel - Driver cancels ride after accepting
router.post('/:id/cancel', driverCancelRide);

// POST /rides/:id/arrived - Driver arrives at pickup
router.post('/:id/arrived', arriveRide);

// POST /rides/:id/start - Driver starts ride
router.post('/:id/start', startRide);

// POST /rides/:id/complete - Driver completes ride
router.post('/:id/complete', completeRide);

// GET /rides/:id - Get ride details
router.get('/:id', getRideById);

module.exports = router;
