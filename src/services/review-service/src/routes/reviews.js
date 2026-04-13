const express = require('express');
const router = express.Router();
const {
    submitReview,
    getDriverReviews,
    getPassengerReviews,
    getReviewByRideId
} = require('../controllers/reviewController');

// POST /reviews - Submit a review for a ride
router.post('/', submitReview);

// GET /reviews/driver/:driverId - Get all reviews for a driver
router.get('/driver/:driverId', getDriverReviews);

// GET /reviews/passenger/:userId - Get all reviews for a passenger
router.get('/passenger/:userId', getPassengerReviews);

// GET /reviews/ride/:rideId - Get review for a specific ride
router.get('/ride/:rideId', getReviewByRideId);

module.exports = router;
