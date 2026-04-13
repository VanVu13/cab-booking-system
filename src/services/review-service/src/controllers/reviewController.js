const Review = require('../models/Review');
const { fn, col } = require('sequelize');
const { getRide } = require('../services/rideClient'); // Import Ride Client
const { publishReviewSubmitted } = require('../events/producer');

/**
 * Submit a review
 * POST /reviews
 */
async function submitReview(req, res) {
    try {
        const { rideId, rating, comment } = req.body;

        // Get user info from token (injected by API Gateway)
        const reviewerId = req.headers['x-user-id'];
        const reviewerRole = req.headers['x-user-role'];

        if (!reviewerId || !reviewerRole) {
            return res.status(401).json({ error: 'Unauthorized: Missing user info' });
        }

        if (!rideId || !rating) {
            return res.status(400).json({
                error: 'rideId and rating are required'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                error: 'Rating must be between 1 and 5'
            });
        }

        // --- SECURITY VERIFICATION START ---
        // 1. Fetch Ride Details
        const ride = await getRide(rideId, reviewerId);
        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        // 2. Verify Ride Status
        if (ride.status !== 'COMPLETED') {
            return res.status(400).json({
                error: `Cannot review ride. Current status: ${ride.status}. Ride must be COMPLETED.`
            });
        }

        // 3. Verify Participant (Reviewer MUST be in the ride)
        let userId, driverId;

        if (reviewerRole === 'PASSENGER') {
            if (ride.userId !== reviewerId) {
                return res.status(403).json({ error: 'Forbidden: You were not the passenger of this ride' });
            }
            userId = reviewerId;
            driverId = ride.driverId; // Auto-fill driverId from ride details
        } else if (reviewerRole === 'DRIVER') {
            if (ride.driverId !== reviewerId) {
                return res.status(403).json({ error: 'Forbidden: You were not the driver of this ride' });
            }
            driverId = reviewerId;
            userId = ride.userId; // Auto-fill userId from ride details
        } else {
            return res.status(403).json({ error: 'Only PASSENGER or DRIVER can review' });
        }
        // --- SECURITY VERIFICATION END ---

        // Check if THIS reviewer already submitted for this ride
        const existingReview = await Review.findOne({
            where: {
                rideId,
                reviewerRole
            }
        });

        if (existingReview) {
            return res.status(409).json({
                error: 'You have already submitted a review for this ride'
            });
        }

        const review = await Review.create({
            rideId,
            userId,
            driverId,
            reviewerRole,
            rating,
            comment: comment || null
        });

        console.log(`✓ Review submitted by ${reviewerRole} ${reviewerId} for ride ${rideId}`);

        // Phát tín hiệu nếu PASSENGER đánh giá DRIVER (để cập nhật DriverProfile)
        if (reviewerRole === 'PASSENGER') {
            // Tính trung bình mới nhất
            const avgResult = await Review.findOne({
                where: { driverId, reviewerRole: 'PASSENGER' },
                attributes: [[fn('AVG', col('rating')), 'averageRating']],
                raw: true
            });
            let newAverage = avgResult.averageRating ? parseFloat(parseFloat(avgResult.averageRating).toFixed(1)) : 5.0;

            // Publish message lên RabbitMQ cho User Service
            publishReviewSubmitted({
                driverId,
                newAverageRating: newAverage,
                newReviewCount: await Review.count({ where: { driverId, reviewerRole: 'PASSENGER' } })
            }).catch(err => console.warn('Failed to publish review event', err));
        }

        return res.status(201).json({
            status: 'review_submitted',
            reviewId: review.id,
            rideId: review.rideId,
            rating: review.rating
        });

    } catch (error) {
        console.error('Submit review error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Get reviews for a driver
 * GET /reviews/driver/:driverId
 */
async function getDriverReviews(req, res) {
    try {
        const { driverId } = req.params;

        const reviews = await Review.findAll({
            where: {
                driverId,
                reviewerRole: 'PASSENGER' // Only include reviews FROM passengers
            },
            order: [['created_at', 'DESC']],
            attributes: ['id', 'rideId', 'userId', 'rating', 'comment', 'created_at']
        });

        // Calculate average rating
        const avgResult = await Review.findOne({
            where: {
                driverId,
                reviewerRole: 'PASSENGER' // Only include reviews FROM passengers
            },
            attributes: [
                [fn('AVG', col('rating')), 'averageRating'],
                [fn('COUNT', col('id')), 'totalReviews']
            ],
            raw: true
        });

        const averageRating = avgResult.averageRating
            ? parseFloat(parseFloat(avgResult.averageRating).toFixed(1))
            : 0;
        const totalReviews = parseInt(avgResult.totalReviews) || 0;

        return res.status(200).json({
            driverId,
            averageRating,
            totalReviews,
            reviews: reviews.map(r => ({
                reviewId: r.id,
                rideId: r.rideId,
                userId: r.userId,
                rating: r.rating,
                comment: r.comment,
                createdAt: r.created_at
            }))
        });

    } catch (error) {
        console.error('Get driver reviews error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Get reviews for a passenger
 * GET /reviews/passenger/:userId
 */
async function getPassengerReviews(req, res) {
    try {
        const { userId } = req.params;

        const reviews = await Review.findAll({
            where: {
                userId,
                reviewerRole: 'DRIVER' // Only include reviews FROM drivers
            },
            order: [['created_at', 'DESC']],
            attributes: ['id', 'rideId', 'driverId', 'rating', 'comment', 'created_at']
        });

        // Calculate average rating
        const avgResult = await Review.findOne({
            where: {
                userId,
                reviewerRole: 'DRIVER' // Only include reviews FROM drivers
            },
            attributes: [
                [fn('AVG', col('rating')), 'averageRating'],
                [fn('COUNT', col('id')), 'totalReviews']
            ],
            raw: true
        });

        const averageRating = avgResult.averageRating
            ? parseFloat(parseFloat(avgResult.averageRating).toFixed(1))
            : 0;
        const totalReviews = parseInt(avgResult.totalReviews) || 0;

        return res.status(200).json({
            userId,
            averageRating,
            totalReviews,
            reviews: reviews.map(r => ({
                reviewId: r.id,
                rideId: r.rideId,
                driverId: r.driverId,
                rating: r.rating,
                comment: r.comment,
                createdAt: r.created_at
            }))
        });

    } catch (error) {
        console.error('Get passenger reviews error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Get review by ride ID
 * GET /reviews/ride/:rideId
 */
async function getReviewByRideId(req, res) {
    try {
        const { rideId } = req.params;

        const review = await Review.findOne({ where: { rideId } });

        if (!review) {
            return res.status(404).json({ error: 'Review not found for this ride' });
        }

        return res.status(200).json({
            reviewId: review.id,
            rideId: review.rideId,
            userId: review.userId,
            driverId: review.driverId,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.created_at
        });

    } catch (error) {
        console.error('Get review by ride error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    submitReview,
    getDriverReviews,
    getPassengerReviews,
    getReviewByRideId
};
