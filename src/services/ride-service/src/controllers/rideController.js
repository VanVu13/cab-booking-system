const Ride = require('../models/Ride');
const { getBooking } = require('../services/bookingClient');
const {
    publishRideStarted,
    publishRideCompleted,
    publishRideArrived,
    publishRideAccepted,
    publishRideRejected
} = require('../events/producer');

/**
 * Helper to ensure ride record exists (Self-healing)
 */
async function ensureRideRecord(rideId, driverId = null) {
    console.log('[RideService] ensureRideRecord called for ' + rideId);
    let ride = await Ride.findOne({ rideId });
    if (ride) return ride;

    console.warn('[RideService] Ride ' + rideId + ' not found locally. Attempting self-healing...');

    try {
        const authUser = driverId || 'SYSTEM_TRACKING';
        console.log(`[RideService] Fetching booking ${rideId} with auth: ${authUser}`);
        const booking = await getBooking(rideId, authUser);

        if (booking) {
            console.log('[RideService] Restoring ride ' + rideId + ' from Booking Service. Payload:', JSON.stringify(booking));
            ride = new Ride({
                rideId: booking.bookingId, // Use bookingId as the primary identifier
                bookingId: booking.bookingId,
                userId: booking.userId, // Critical fix: Map userId from booking
                driverId: booking.driverId || (driverId !== 'SYSTEM_TRACKING' ? driverId : null) || 'TBD',
                pickup: booking.pickup,
                drop: booking.drop,
                pickupLat: booking.pickup ? booking.pickup.lat : 0,
                pickupLng: booking.pickup ? booking.pickup.lng : 0,
                destLat: booking.drop ? booking.drop.lat : 0,
                destLng: booking.drop ? booking.drop.lng : 0,
                vehicleType: booking.vehicleType,
                paymentMethod: booking.paymentMethod || 'CASH',
                // Status mapping: PROPOSED/SEARCHING -> ASSIGNED. Keep others if valid.
                status: ['PROPOSED', 'SEARCHING_DRIVER'].includes(booking.status) ? 'ASSIGNED' : booking.status,
                estimatedPrice: booking.estimatedPrice
            });
            await ride.save();
            return ride;
        } else {
            console.warn(`[RideService] Booking ${rideId} not found in Booking Service for auth ${authUser}`);
        }
    } catch (err) {
        console.error('[RideService] ensureRideRecord error:', err.message);
    }
    return null;
}

/**
 * Accept a ride request
 */
async function acceptRide(req, res) {
    try {
        const { id } = req.params;
        const driverId = req.headers['x-user-id'];
        console.log('[RideService] acceptRide called for ' + id + ' by ' + driverId);

        if (!driverId) {
            return res.status(401).json({ error: 'Unauthorized: Missing driver ID' });
        }

        const ride = await ensureRideRecord(id, driverId);

        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        // Allow accept from PROPOSED, SEARCHING_DRIVER, or ASSIGNED status
        const acceptableStatuses = ['PROPOSED', 'SEARCHING_DRIVER', 'ASSIGNED'];
        if (!acceptableStatuses.includes(ride.status)) {
            return res.status(400).json({
                error: 'Cannot accept ride. Current status: ' + ride.status
            });
        }

        ride.status = 'ASSIGNED';
        ride.driverId = driverId;
        await ride.save();

        await publishRideAccepted({
            rideId: ride.rideId,
            userId: ride.userId,
            driverId: driverId
        });

        console.log('✓ Driver ' + driverId + ' accepted ride ' + id);

        return res.status(200).json({
            status: 'ride_accepted',
            rideId: ride.rideId,
            driverId: driverId
        });
    } catch (error) {
        console.error('Accept ride error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Reject a ride request
 */
async function rejectRide(req, res) {
    try {
        const { id } = req.params;
        const driverId = req.headers['x-user-id'];
        const { reason } = req.body;
        console.log('[RideService] rejectRide called for ' + id + ' by ' + driverId);

        if (!driverId) {
            return res.status(401).json({ error: 'Unauthorized: Missing driver ID' });
        }

        const ride = await ensureRideRecord(id, driverId);

        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        // Clean up the local ride state by removing it, so subsequent fetches pull pure SEARCHING_DRIVER from booking service
        await Ride.deleteOne({ rideId: ride.rideId });

        await publishRideRejected({
            rideId: ride.rideId,
            userId: ride.userId,
            driverId: driverId,
            pickup: ride.pickup,
            drop: ride.drop,
            vehicleType: ride.vehicleType,
            estimatedPrice: ride.estimatedPrice,
            reason: reason || 'Driver rejected'
        });

        console.log('✓ Driver ' + driverId + ' rejected ride ' + id);

        return res.status(200).json({
            status: 'ride_rejected',
            rideId: ride.rideId
        });
    } catch (error) {
        console.error('Reject ride error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Driver cancels a ride after accepting it
 */
async function driverCancelRide(req, res) {
    try {
        const { id } = req.params;
        const driverId = req.headers['x-user-id'];
        const { reason } = req.body;
        console.log('[RideService] driverCancelRide called for ' + id + ' by ' + driverId);

        if (!driverId) {
            return res.status(401).json({ error: 'Unauthorized: Missing driver ID' });
        }

        const ride = await ensureRideRecord(id, driverId);

        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        if (ride.driverId !== driverId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await Ride.deleteOne({ rideId: ride.rideId });

        await publishRideRejected({
            rideId: ride.rideId,
            userId: ride.userId,
            driverId: driverId,
            pickup: ride.pickup,
            drop: ride.drop,
            vehicleType: ride.vehicleType,
            estimatedPrice: ride.estimatedPrice,
            reason: reason || 'DRIVER_CANCELLED' // Can be used in AI matching to exclude driver
        });

        console.log('✓ Driver ' + driverId + ' cancelled ride ' + id + ', reverting to SEARCHING_DRIVER');

        return res.status(200).json({
            status: 'ride_cancelled',
            rideId: ride.rideId
        });
    } catch (error) {
        console.error('Driver cancel ride error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Arrive at pickup location
 */
async function arriveRide(req, res) {
    try {
        const { id } = req.params;
        const driverId = req.headers['x-user-id'];
        console.log('[RideService] arriveRide called for ' + id + ' by ' + driverId);

        if (!driverId) {
            return res.status(401).json({ error: 'Unauthorized: Missing driver ID' });
        }

        const ride = await ensureRideRecord(id, driverId);

        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        if (ride.driverId !== driverId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (ride.status !== 'ASSIGNED') {
            return res.status(400).json({ error: 'Cannot arrive. Current status: ' + ride.status });
        }

        ride.status = 'ARRIVED';
        await ride.save();

        await publishRideArrived({
            rideId: ride.rideId,
            userId: ride.userId,
            driverId: ride.driverId
        });

        console.log('✓ Driver ' + driverId + ' arrived for ride ' + id);

        return res.status(200).json({
            status: 'ride_arrived',
            rideId: ride.rideId
        });
    } catch (error) {
        console.error('Arrive ride error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Start a ride
 */
async function startRide(req, res) {
    try {
        const { id } = req.params;
        const driverId = req.headers['x-user-id'];
        console.log('[RideService] startRide called for ' + id + ' by ' + driverId);

        if (!driverId) {
            return res.status(401).json({ error: 'Unauthorized: Missing driver ID' });
        }

        const ride = await ensureRideRecord(id, driverId);

        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        if (ride.driverId !== driverId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (ride.status !== 'ASSIGNED' && ride.status !== 'ARRIVED') {
            return res.status(400).json({
                error: 'Cannot start ride. Current status: ' + ride.status
            });
        }

        ride.status = 'IN_PROGRESS';
        ride.startedAt = new Date();

        await ride.save();

        await publishRideStarted({
            rideId: ride.rideId,
            userId: ride.userId,
            driverId: ride.driverId,
            startedAt: ride.startedAt.toISOString()
        });

        console.log('✓ Ride ' + ride.rideId + ' started');

        return res.status(200).json({
            status: 'ride_started',
            rideId: ride.rideId,
            driverId: ride.driverId,
            startedAt: ride.startedAt
        });

    } catch (error) {
        console.error('Start ride error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Complete a ride
 */
async function completeRide(req, res) {
    try {
        const { id } = req.params;
        const { distanceMeters, durationSeconds } = req.body;
        const driverId = req.headers['x-user-id'];

        if (!driverId) {
            return res.status(401).json({ error: 'Unauthorized: Missing driver ID' });
        }

        const ride = await Ride.findOne({ rideId: id });

        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        if (ride.status !== 'IN_PROGRESS') {
            return res.status(400).json({
                error: 'Cannot complete ride. Current status: ' + ride.status
            });
        }

        if (ride.driverId !== driverId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // distanceMeters and durationSeconds are optional - default to 0 if not provided
        const finalDistanceMeters = distanceMeters || 0;
        const finalDurationSeconds = durationSeconds || 0;

        const finalPrice = ride.estimatedPrice || (15000 + (finalDistanceMeters / 1000 * 10000) + (finalDurationSeconds / 60 * 500));

        ride.status = 'COMPLETED';
        ride.distanceMeters = distanceMeters || 0;
        ride.durationSeconds = durationSeconds || 0;
        ride.finalPrice = Math.round(finalPrice);
        ride.completedAt = new Date();
        await ride.save();

        await publishRideCompleted({
            rideId: ride.rideId,
            userId: ride.userId,
            driverId: ride.driverId,
            paymentMethod: ride.paymentMethod || 'CASH',
            finalPrice: ride.finalPrice,
            distanceMeters: ride.distanceMeters,
            durationSeconds: ride.durationSeconds,
            completedAt: ride.completedAt.toISOString()
        });

        console.log('✓ Ride ' + ride.rideId + ' completed');

        return res.status(200).json({
            status: 'ride_completed',
            rideId: ride.rideId,
            finalPrice: ride.finalPrice,
            distanceMeters: ride.distanceMeters,
            durationSeconds: ride.durationSeconds,
            completedAt: ride.completedAt
        });

    } catch (error) {
        console.error('Complete ride error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Get ride by ID
 */
async function getRideById(req, res) {
    try {
        const { id } = req.params;
        const currentUserId = req.headers['x-user-id'];

        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const ride = await ensureRideRecord(id, currentUserId);

        if (!ride) {
            return res.status(404).json({ error: 'Ride not found' });
        }

        if (ride.userId !== currentUserId && ride.driverId !== currentUserId && currentUserId !== 'SYSTEM_TRACKING') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        let driverLocation = null;
        const activeStatuses = ['ASSIGNED', 'ARRIVED', 'IN_PROGRESS'];
        if (activeStatuses.includes(ride.status)) {
            if (ride.driverId) {
                try {
                    const { getDriverLocation: getExternalDriverLocation } = require('../services/driverClient');
                    driverLocation = await getExternalDriverLocation(ride.driverId);
                } catch (e) {
                    console.warn('[RideController] Driver client not found or failed', e.message);
                }
            }
        }

        // FETCH PROFILES
        let passengerProfile = null;
        let driverProfile = null;

        try {
            const { getUserProfile } = require('../services/userClient');
            if (ride.userId) {
                passengerProfile = await getUserProfile(ride.userId, 'PASSENGER');
            }
            if (ride.driverId && ride.driverId !== 'TBD') {
                console.log(`[RideController] Fetching profile for driver: ${ride.driverId}`);
                driverProfile = await getUserProfile(ride.driverId, 'DRIVER');
                console.log(`[RideController] Driver profile result:`, driverProfile ? 'Found' : 'Not Found', driverProfile);
            }
        } catch (error) {
            console.warn('[RideController] Profile client not found or failed', error.message);
        }

        // Fetch booking data for estimated distance/duration (not stored in Ride model)
        let estimatedDistance = 0;
        let tripEtaSeconds = 0;
        try {
            const booking = await getBooking(ride.rideId, 'SYSTEM_TRACKING');
            if (booking) {
                estimatedDistance = booking.estimatedDistance || 0;
                tripEtaSeconds = booking.tripEtaSeconds || 0;
            }
        } catch (err) {
            console.warn('[RideController] Failed to fetch booking for estimated data:', err.message);
        }

        return res.status(200).json({
            rideId: ride.rideId,
            userId: ride.userId,
            driverId: ride.driverId,
            passengerName: passengerProfile?.name,
            passengerPhone: passengerProfile?.phone,
            passengerAvatar: passengerProfile?.avatar,

            driverName: driverProfile?.name,
            driverPhone: driverProfile?.phone,
            driverAvatar: driverProfile?.avatar,
            driverRating: driverProfile?.rating, // If available
            vehicleDetails: driverProfile?.vehicleDetails,

            pickup: ride.pickup,
            drop: ride.drop,
            vehicleType: ride.vehicleType,
            paymentMethod: ride.paymentMethod,
            status: ride.status,
            estimatedPrice: ride.estimatedPrice,
            estimatedDistance: estimatedDistance,
            tripEtaSeconds: tripEtaSeconds,
            finalPrice: ride.finalPrice,
            distanceMeters: ride.distanceMeters,
            durationSeconds: ride.durationSeconds,
            startedAt: ride.startedAt,
            completedAt: ride.completedAt,
            createdAt: ride.createdAt,
            driverLocation: driverLocation
        });
    } catch (error) {
        console.error('Get ride error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /rides/driver/stats
 * Get driver statistics: earnings today, total trips, trips today
 */
async function getDriverStats(req, res) {
    try {
        const driverId = req.headers['x-user-id'];

        if (!driverId) {
            return res.status(401).json({ error: 'Unauthorized: Missing driver ID' });
        }

        // Calculate start of today (UTC)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Earnings today: SUM(finalPrice) of COMPLETED rides today
        const todayAgg = await Ride.aggregate([
            {
                $match: {
                    driverId: driverId,
                    status: 'COMPLETED',
                    completedAt: { $gte: todayStart }
                }
            },
            {
                $group: {
                    _id: null,
                    earningsToday: { $sum: { $ifNull: ['$finalPrice', 0] } },
                    tripsToday: { $sum: 1 }
                }
            }
        ]);

        // Total trips: COUNT all COMPLETED rides
        const totalTrips = await Ride.countDocuments({
            driverId: driverId,
            status: 'COMPLETED'
        });

        const earningsToday = todayAgg.length > 0 ? todayAgg[0].earningsToday : 0;
        const tripsToday = todayAgg.length > 0 ? todayAgg[0].tripsToday : 0;

        console.log(`✓ Driver ${driverId} stats: earningsToday=${earningsToday}, tripsToday=${tripsToday}, totalTrips=${totalTrips}`);

        return res.status(200).json({
            earningsToday,
            tripsToday,
            totalTrips
        });

    } catch (error) {
        console.error('Get driver stats error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /rides/driver/history
 * Get driver's completed ride history with pagination
 */
async function getDriverHistory(req, res) {
    try {
        const driverId = req.headers['x-user-id'];

        if (!driverId) {
            return res.status(401).json({ error: 'Unauthorized: Missing driver ID' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Fetch completed rides for this driver, sorted by most recent
        const rides = await Ride.find({
            driverId: driverId,
            status: 'COMPLETED'
        })
            .sort({ completedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Ride.countDocuments({
            driverId: driverId,
            status: 'COMPLETED'
        });

        console.log(`✓ Driver ${driverId} history: ${rides.length} rides (page ${page}, total ${total})`);

        return res.status(200).json({
            rides: rides.map(r => ({
                id: r.rideId,
                pickup: r.pickup || {},
                drop: r.drop || {},
                estimatedPrice: r.estimatedPrice || 0,
                finalPrice: r.finalPrice || 0,
                status: r.status,
                distance: r.distanceMeters || 0,
                duration: r.durationSeconds || 0,
                createdAt: r.createdAt,
                completedAt: r.completedAt
            })),
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error('Get driver history error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    acceptRide,
    rejectRide,
    driverCancelRide,
    arriveRide,
    startRide,
    completeRide,
    getRideById,
    getDriverStats,
    getDriverHistory
};
