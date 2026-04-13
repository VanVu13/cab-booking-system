const { v4: uuidv4 } = require('uuid');
const Booking = require('../models/Booking');
const { getPriceEstimate } = require('../services/pricingClient');
const { getEtaEstimate } = require('../services/etaClient');
const { publishRideCreated, publishRideCancelled } = require('../events/producer');

/**
 * Create a new booking
 * POST /bookings
 */
async function createBooking(req, res) {
    try {
        const { pickup, drop, vehicleType, paymentMethod, distance_km } = req.body;
        const userId = req.headers['x-user-id'] || req.headers['iduser'] || req.query.iduser || req.query.userId || req.body?.iduser || req.body?.userId;

        // Validate required fields
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
        }
        if (!pickup || !drop) {
            return res.status(400).json({
                error: 'Missing required fields: pickup, drop'
            });
        }

        // Validate vehicleType
        const validVehicleTypes = ['SEDAN', 'SUV', 'BIKE'];
        const selectedVehicleType = vehicleType || 'SEDAN';
        if (!validVehicleTypes.includes(selectedVehicleType)) {
            return res.status(400).json({
                error: `Invalid vehicleType. Must be one of: ${validVehicleTypes.join(', ')}`
            });
        }

        // Validate paymentMethod
        const validPaymentMethods = ['CASH', 'CARD', 'WALLET'];
        const selectedPaymentMethod = paymentMethod || 'CASH';
        if (!validPaymentMethods.includes(selectedPaymentMethod)) {
            return res.status(400).json({
                error: `Invalid paymentMethod. Must be one of: ${validPaymentMethods.join(', ')}`
            });
        }

        const isValidNumber = (val) => typeof val === 'number' && Number.isFinite(val) && !Number.isNaN(val);

        if (
            !isValidNumber(pickup.lat) ||
            !isValidNumber(pickup.lng) ||
            !isValidNumber(drop.lat) ||
            !isValidNumber(drop.lng)
        ) {
            return res.status(422).json({
                error: 'Invalid data type: lat and lng must be valid finite numbers'
            });
        }

        // Check Idempotency Key
        const idempotencyKey = req.headers['idempotency-key'];
        if (idempotencyKey) {
            const existingBooking = await Booking.findOne({ idempotencyKey, userId });
            if (existingBooking) {
                console.log(`✓ Returning existing booking for idempotencyKey: ${idempotencyKey}`);
                return res.status(200).json({
                    bookingId: existingBooking.bookingId,
                    rideId: existingBooking.bookingId,
                    status: existingBooking.status,
                    pickup: existingBooking.pickup,
                    drop: existingBooking.drop,
                    vehicleType: existingBooking.vehicleType,
                    paymentMethod: existingBooking.paymentMethod,
                    estimatedPrice: existingBooking.estimatedPrice,
                    currency: existingBooking.currency,
                    pickupEtaSeconds: existingBooking.pickupEtaSeconds,
                    tripEtaSeconds: existingBooking.tripEtaSeconds,
                    alreadyProcessed: true
                });
            }
        }


        // Generate booking ID
        const bookingId = uuidv4();

        // 1+2. Get price AND ETA estimates in parallel (Performance optimization)
        let pricingData = {};
        let etaData = {};
        try {
            const [pricingResult, etaResult] = await Promise.allSettled([
                getPriceEstimate(pickup, drop, vehicleType || 'SEDAN'),
                getEtaEstimate(pickup, drop)
            ]);

            // Handle Pricing result
            if (pricingResult.status === 'fulfilled') {
                pricingData = pricingResult.value;
                if (distance_km) {
                    pricingData.estimatedPrice = distance_km * 15000 * (pricingData.surgeMultiplier || 1.0);
                }
            } else {
                console.warn('Pricing service unavailable, using defaults:', pricingResult.reason?.message);
                pricingData = { estimatedPrice: distance_km ? distance_km * 15000 : 0, currency: 'VND', surgeMultiplier: 1.0 };
            }

            // Handle ETA result
            if (etaResult.status === 'fulfilled') {
                etaData = etaResult.value;
                if (distance_km) {
                    etaData.tripEtaSeconds = distance_km * 180;
                    etaData.pickupEtaSeconds = 300;
                    etaData.tripDistanceMeters = distance_km * 1000;
                }
            } else {
                console.warn('ETA service unavailable, using defaults:', etaResult.reason?.message);
                etaData = {
                    pickupEtaSeconds: distance_km ? 300 : 0,
                    tripEtaSeconds: distance_km ? distance_km * 180 : 0,
                    tripDistanceMeters: distance_km ? distance_km * 1000 : 0
                };
            }
        } catch (error) {
            console.warn('Both services failed, using defaults');
            pricingData = { estimatedPrice: distance_km ? distance_km * 15000 : 0, currency: 'VND', surgeMultiplier: 1.0 };
            etaData = { pickupEtaSeconds: 0, tripEtaSeconds: 0, tripDistanceMeters: 0 };
        }

        // 3. Create booking document
        const booking = new Booking({
            bookingId,
            userId,
            idempotencyKey,
            pickup,
            drop,
            vehicleType: selectedVehicleType,
            paymentMethod: selectedPaymentMethod,
            status: 'SEARCHING_DRIVER',
            estimatedPrice: pricingData.estimatedPrice,
            currency: pricingData.currency,
            surgeMultiplier: pricingData.surgeMultiplier,
            pickupEtaSeconds: etaData.pickupEtaSeconds,
            tripEtaSeconds: etaData.tripEtaSeconds,
            estimatedDistance: etaData.tripDistanceMeters
        });

        try {
            await booking.save();
        } catch (dbError) {
            if (dbError.code === 11000 && dbError.keyPattern && dbError.keyPattern.idempotencyKey) {
                // Race condition handled: another request with the same idempotency key just saved it
                const existingBooking = await Booking.findOne({ idempotencyKey, userId });
                if (existingBooking) {
                    console.log(`✓ Handled race condition: Returning existing booking for idempotencyKey: ${idempotencyKey}`);
                    return res.status(200).json({
                        bookingId: existingBooking.bookingId,
                        rideId: existingBooking.bookingId,
                        status: existingBooking.status,
                        pickup: existingBooking.pickup,
                        drop: existingBooking.drop,
                        vehicleType: existingBooking.vehicleType,
                        paymentMethod: existingBooking.paymentMethod,
                        estimatedPrice: existingBooking.estimatedPrice,
                        currency: existingBooking.currency,
                        pickupEtaSeconds: existingBooking.pickupEtaSeconds,
                        tripEtaSeconds: existingBooking.tripEtaSeconds,
                        alreadyProcessed: true
                    });
                }
            }
            throw dbError;
        }
        console.log(`✓ Booking created: ${bookingId}`);

        // 4. Publish ride.created event (Background - Do not await for faster response)
        publishRideCreated(booking).catch(err => {
            console.error('Failed to publish ride.created event in background:', err);
        });

        // 5. Return response (per contract)
        return res.status(201).json({
            bookingId: booking.bookingId,
            rideId: booking.bookingId, // Alias for matching scripts
            status: booking.status,
            pickup: booking.pickup, // might be useful
            drop: booking.drop, // might be useful
            vehicleType: booking.vehicleType,
            paymentMethod: booking.paymentMethod,
            estimatedPrice: booking.estimatedPrice,
            currency: booking.currency,
            pickupEtaSeconds: booking.pickupEtaSeconds,
            tripEtaSeconds: booking.tripEtaSeconds,
            estimatedDistance: booking.estimatedDistance
        });

    } catch (error) {
        console.error('Create booking error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Get booking by ID
 * GET /bookings/:id
 */
async function getBookingById(req, res) {
    try {
        const { id } = req.params;

        const booking = await Booking.findOne({ bookingId: id });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Ownership check: allow customer or assigned driver or PROVISIONAL driver (for self-healing) or SYSTEM_TRACKING
        const currentUserId = req.headers['x-user-id'] || req.headers['iduser'] || req.query.iduser || req.query.userId || req.body?.iduser || req.body?.userId;
        const isAuthorized = booking.userId === currentUserId ||
            booking.driverId === currentUserId ||
            booking.provisionalDriverId === currentUserId ||
            currentUserId === 'SYSTEM_TRACKING';

        if (!isAuthorized) {
            return res.status(403).json({ error: 'Forbidden: You can only view your own bookings' });
        }

        // Return response (per contract)
        return res.status(200).json({
            bookingId: booking.bookingId,
            rideId: booking.bookingId, // Alias for matching scripts
            status: booking.status,
            pickup: booking.pickup,
            drop: booking.drop,
            vehicleType: booking.vehicleType,
            paymentMethod: booking.paymentMethod,
            estimatedPrice: booking.estimatedPrice,
            currency: booking.currency,
            pickupEtaSeconds: booking.pickupEtaSeconds,
            tripEtaSeconds: booking.tripEtaSeconds,
            estimatedDistance: booking.estimatedDistance,
            driverId: booking.driverId,
            userId: booking.userId, // Critical: Return userId for inter-service communication
            paymentStatus: booking.paymentStatus,
            createdAt: booking.createdAt
        });

    } catch (error) {
        console.error('Get booking error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Get all bookings for a user
 * GET /bookings?userId=xxx
 */
async function getBookingsByUser(req, res) {
    try {
        const userId = req.headers['x-user-id'] || req.headers['iduser'] || req.query.user_id || req.query.iduser || req.query.userId || req.body?.iduser || req.body?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
        }

        const bookings = await Booking.find({ userId }).sort({ createdAt: -1 }).limit(50);

        return res.status(200).json({
            bookings: bookings.map(b => ({
                bookingId: b.bookingId,
                status: b.status,
                pickup: b.pickup,
                drop: b.drop,
                vehicleType: b.vehicleType,
                paymentMethod: b.paymentMethod,
                estimatedPrice: b.estimatedPrice,
                estimatedDistance: b.estimatedDistance,
                driverId: b.driverId,
                createdAt: b.createdAt
            }))
        });

    } catch (error) {
        console.error('Get bookings error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Cancel a booking
 * DELETE /bookings/:id
 */
async function cancelBooking(req, res) {
    try {
        const { id } = req.params;

        const booking = await Booking.findOne({ bookingId: id });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Ownership check
        const currentUserId = req.headers['x-user-id'] || req.headers['iduser'] || req.query.iduser || req.query.userId || req.body?.iduser || req.body?.userId;
        if (booking.userId !== currentUserId) {
            return res.status(403).json({ error: 'Forbidden: You can only cancel your own bookings' });
        }

        const cancellableStatuses = ['SEARCHING_DRIVER', 'PROPOSED', 'DRIVER_ASSIGNED'];
        if (!cancellableStatuses.includes(booking.status)) {
            return res.status(400).json({
                error: 'Cannot cancel booking. Current status: ' + booking.status
            });
        }

        const previousStatus = booking.status;
        booking.status = 'CANCELLED';
        await booking.save();

        // Publish ride.cancelled event universally to notify AI-matching and driver-service
        await publishRideCancelled({
            rideId: booking.bookingId,
            driverId: booking.driverId || null,
            reason: 'CUSTOMER_CANCELLED'
        });

        return res.status(200).json({
            bookingId: booking.bookingId,
            status: booking.status,
            message: 'Booking cancelled successfully'
        });

    } catch (error) {
        console.error('Cancel booking error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    createBooking,
    getBookingById,
    getBookingsByUser,
    cancelBooking
};
