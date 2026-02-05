const UserProfile = require('../models/UserProfile');
const DriverProfile = require('../models/DriverProfile');

/**
 * Get profile based on role and user ID
 */
async function getProfile(req, res) {
    try {
        const userId = req.headers['x-user-id'];
        const role = req.headers['x-user-role'];
        const email = req.headers['x-user-email'] || ''; // Optional, depends if Gateway forwards it

        if (!userId || !role) {
            return res.status(401).json({ error: 'User identification missing in headers' });
        }

        let profile;
        if (role === 'DRIVER') {
            profile = await DriverProfile.findOne({ where: { driverId: userId } });

            // Lazy create if not found
            if (!profile) {
                profile = await DriverProfile.create({
                    driverId: userId,
                    name: 'New Driver',
                    email: email || `driver_${userId.substring(0, 8)}@system.com`,
                });
                console.log(`[USER SERVICE] Auto-created driver profile for ${userId} (${profile.email})`);
            }
        } else {
            profile = await UserProfile.findOne({ where: { userId: userId } });

            // Lazy create if not found
            if (!profile) {
                profile = await UserProfile.create({
                    userId: userId,
                    name: 'New Passenger',
                    email: email || `user_${userId.substring(0, 8)}@system.com`,
                });
                console.log(`[USER SERVICE] Auto-created passenger profile for ${userId} (${profile.email})`);
            }
        }

        // Sync-on-Read: If header has real email but DB has dummy, update DB
        if (email && profile.email.endsWith('@system.com') && (profile.email.startsWith('user_') || profile.email.startsWith('driver_'))) {
            profile.email = email;
            await profile.save();
            console.log(`[USER SERVICE] Synced dummy email to real email for ${userId}: ${email}`);
        }

        return res.status(200).json({
            userId: userId,
            name: profile.name,
            email: profile.email,
            role: role,
            phone: profile.phone,
            ...(role === 'DRIVER' ? {
                licenseNumber: profile.licenseNumber,
                vehicleDetails: profile.vehicleDetails
            } : {})
        });
    } catch (error) {
        console.error('[USER SERVICE] Get Profile Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Update profile
 */
async function updateProfile(req, res) {
    try {
        const userId = req.headers['x-user-id'];
        const role = req.headers['x-user-role'];
        const { name, phone } = req.body;

        if (!userId || !role) {
            return res.status(401).json({ error: 'User identification missing in headers' });
        }

        let profile;
        if (role === 'DRIVER') {
            profile = await DriverProfile.findOne({ where: { driverId: userId } });
        } else {
            profile = await UserProfile.findOne({ where: { userId: userId } });
        }

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        if (name) profile.name = name;
        if (phone) profile.phone = phone;

        await profile.save();

        return res.status(200).json({ status: 'updated' });
    } catch (error) {
        console.error('[USER SERVICE] Update Profile Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getProfile,
    updateProfile
};
