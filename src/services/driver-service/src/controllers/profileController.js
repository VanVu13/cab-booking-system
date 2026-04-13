const DriverProfile = require('../models/DriverProfile');

/**
 * POST /drivers/profile
 * Create driver profile (called from auth-service during registration)
 */
async function createProfile(req, res) {
    try {
        const { driverId, phone, licenseNumber, vehicleType, vehiclePlate, vehicleModel, vehicleColor } = req.body;

        if (!driverId || !phone || !licenseNumber || !vehicleType || !vehiclePlate || !vehicleModel || !vehicleColor) {
            return res.status(400).json({ error: 'All profile fields are required' });
        }

        // Check if profile already exists
        const existing = await DriverProfile.findByPk(driverId);
        if (existing) {
            return res.status(409).json({ error: 'Driver profile already exists' });
        }

        const profile = await DriverProfile.create({
            driverId,
            phone,
            licenseNumber,
            vehicleType,
            vehiclePlate,
            vehicleModel,
            vehicleColor
        });

        console.log(`✓ Driver profile created for: ${driverId}`);
        return res.status(201).json(profile);

    } catch (error) {
        console.error('Create profile error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /drivers/:id/profile
 * Get full driver profile (ABAC: only owner or admin can access)
 */
async function getProfile(req, res) {
    try {
        const profileId = req.params.id;
        const requesterId = req.headers['x-user-id'];
        const requesterRole = req.headers['x-user-role'];

        // ABAC: Only the driver themselves or an ADMIN can view full profile
        if (requesterRole !== 'ADMIN' && requesterId !== profileId) {
            console.warn(`[SECURITY] User ${requesterId} attempted to access profile of ${profileId}`);
            return res.status(403).json({ error: 'Bạn không có quyền xem thông tin tài xế này' });
        }

        const profile = await DriverProfile.findByPk(profileId);
        if (!profile) {
            return res.status(404).json({ error: 'Driver profile not found' });
        }

        return res.status(200).json(profile);

    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /drivers/:id/profile-internal
 * Internal endpoint for service-to-service communication (no auth check)
 * Used by auth-service admin endpoints to fetch driver profiles
 */
async function getProfileInternal(req, res) {
    try {
        const profile = await DriverProfile.findByPk(req.params.id);
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        return res.status(200).json(profile);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /drivers/:id/public-profile
 * Public profile for passengers to view driver info during a ride
 * Only returns non-sensitive data (no phone, no license)
 */
async function getPublicProfile(req, res) {
    try {
        const profile = await DriverProfile.findByPk(req.params.id, {
            attributes: ['driverId', 'vehicleType', 'vehiclePlate', 'vehicleModel', 'vehicleColor', 'rating', 'totalTrips']
        });

        if (!profile) {
            return res.status(404).json({ error: 'Driver profile not found' });
        }

        return res.status(200).json(profile);

    } catch (error) {
        console.error('Get public profile error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * PATCH /drivers/:id/rejection-reason
 * Set rejection/suspension reason (called from auth-service admin endpoint)
 */
async function setRejectionReason(req, res) {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const profile = await DriverProfile.findByPk(id);
        if (!profile) {
            return res.status(404).json({ error: 'Driver profile not found' });
        }

        profile.rejectionReason = reason;
        await profile.save();

        return res.status(200).json({ message: 'Rejection reason updated' });

    } catch (error) {
        console.error('Set rejection reason error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /drivers/admin/all
 * List all driver profiles (ADMIN only)
 */
async function getAllProfiles(req, res) {
    try {
        const profiles = await DriverProfile.findAll({
            order: [['created_at', 'DESC']]
        });

        return res.status(200).json({ drivers: profiles });

    } catch (error) {
        console.error('Get all profiles error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    createProfile,
    getProfile,
    getProfileInternal,
    getPublicProfile,
    setRejectionReason,
    getAllProfiles
};
