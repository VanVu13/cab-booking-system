const express = require('express');
const router = express.Router();
const { updateLocation, getNearbyDrivers, getDriverLocation, updateStatus } = require('../controllers/driverController');
const { createProfile, getProfile, getProfileInternal, getPublicProfile, setRejectionReason, getAllProfiles } = require('../controllers/profileController');
const { getEarningsSummary, getWalletBalance, getWalletTransactions } = require('../controllers/walletController');

// ===================== DRIVER PROFILE ROUTES =====================

// POST /drivers/profile - Create driver profile (called from auth-service)
router.post('/profile', createProfile);

// GET /drivers/admin/all - List all driver profiles (ADMIN only)
// NOTE: Must be BEFORE /:id routes to avoid route collision
router.get('/admin/all', getAllProfiles);

// ===================== EARNINGS & WALLET ROUTES =====================

// GET /drivers/earnings - Get earnings summary (balance + today earnings)
router.get('/earnings', getEarningsSummary);

// GET /drivers/wallet - Get wallet balance
router.get('/wallet', getWalletBalance);

// GET /drivers/wallet/transactions - Get wallet transaction history
router.get('/wallet/transactions', getWalletTransactions);

// GET /drivers/rides/history - Proxy to ride-service for completed ride history
router.get('/rides/history', async (req, res) => {
    try {
        const axios = require('axios');
        const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://ride-service:3007';
        const response = await axios.get(`${rideServiceUrl}/rides/driver/history`, {
            headers: {
                'x-user-id': req.headers['x-user-id'] || '',
                'authorization': req.headers['authorization'] || ''
            },
            params: req.query
        });
        return res.status(200).json(response.data);
    } catch (error) {
        console.error('[DriverService] Proxy ride history error:', error.message);
        // If ride-service is down, return empty
        return res.status(200).json({ rides: [], total: 0, page: 1 });
    }
});

// ===================== DRIVER PROFILE (by ID) =====================

// GET /drivers/:id/profile - Get full driver profile (ABAC protected)
router.get('/:id/profile', getProfile);

// GET /drivers/:id/profile-internal - Internal service-to-service (no auth)
router.get('/:id/profile-internal', getProfileInternal);

// GET /drivers/:id/public-profile - Public info for passengers
router.get('/:id/public-profile', getPublicProfile);

// PATCH /drivers/:id/rejection-reason - Set rejection reason (from auth-service)
router.patch('/:id/rejection-reason', setRejectionReason);

// ===================== LOCATION & STATUS ROUTES =====================

// POST /drivers/location - Update driver GPS location
router.post('/location', updateLocation);

// PATCH /drivers/status - Update driver online status
router.patch('/status', updateStatus);

// GET /drivers/nearby - Find nearby available drivers
router.get('/nearby', getNearbyDrivers);

// GET /drivers/:id/location - Get specific driver location
router.get('/:id/location', getDriverLocation);

module.exports = router;

