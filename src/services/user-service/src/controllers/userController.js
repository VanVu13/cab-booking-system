const UserProfile = require('../models/UserProfile');
const DriverProfile = require('../models/DriverProfile');

const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || 'http://driver-service:3004';

/**
 * Get profile based on role and user ID
 */
async function getProfile(req, res) {
    try {
        const userId = req.headers['x-user-id'];
        const role = req.headers['x-user-role'];
        const email = req.headers['x-user-email'] || ''; // Optional, depends if Gateway forwards it

        if (!userId || !role) {
            console.warn('[USER SERVICE] Get Profile Failed - Missing headers:', { userId, role });
            return res.status(401).json({ error: 'User identification missing in headers' });
        }

        console.log(`[USER SERVICE] Fetching profile for ${userId} (${role})`);

        let profile;
        if (role === 'DRIVER') {
            profile = await DriverProfile.findOne({ where: { driverId: userId } });

            // Lazy create if not found
            if (!profile) {
                // Try to fetch driver info from driver-service to prefill
                let phone = null;
                let licenseNumber = null;
                let vehicleDetails = null;

                try {
                    const response = await fetch(`${DRIVER_SERVICE_URL}/drivers/${userId}/profile-internal`);
                    if (response.ok) {
                        const dsData = await response.json();
                        phone = dsData.phone || null;
                        licenseNumber = dsData.licenseNumber || null;
                        if (dsData.vehicleType || dsData.vehiclePlate) {
                            vehicleDetails = {
                                type: dsData.vehicleType || 'SEDAN',
                                plate: dsData.vehiclePlate || '',
                                model: dsData.vehicleModel || '',
                                color: dsData.vehicleColor || '',
                                make: '',
                                year: '',
                                photoUrl: ''
                            };
                        }
                    }
                } catch (err) {
                    console.error('[USER SERVICE] Failed to fetch initial driver info from driver-service', err.message);
                }

                profile = await DriverProfile.create({
                    driverId: userId,
                    name: req.headers['x-user-name'] || 'New Driver',
                    email: email || `driver_${userId.substring(0, 8)}@system.com`,
                    phone,
                    licenseNumber,
                    vehicleDetails
                });
                console.log(`[USER SERVICE] Auto-created driver profile for ${userId} (${profile.email})`);
            }
        } else {
            profile = await UserProfile.findOne({ where: { userId: userId } });

            // Lazy create if not found
            if (!profile) {
                profile = await UserProfile.create({
                    userId: userId,
                    name: req.headers['x-user-name'] || 'New Passenger',
                    email: email || `user_${userId.substring(0, 8)}@system.com`,
                });
                console.log(`[USER SERVICE] Auto-created passenger profile for ${userId} (${profile.email})`);
            }
        }

        // Sync-on-Read: If header has real email/name but DB has dummy/default, update DB
        let updated = false;
        if (email && profile.email.endsWith('@system.com') && (profile.email.startsWith('user_') || profile.email.startsWith('driver_'))) {
            profile.email = email;
            updated = true;
        }
        if (req.headers['x-user-name'] && (profile.name === 'New Driver' || profile.name === 'New Passenger')) {
            profile.name = req.headers['x-user-name'];
            updated = true;
        }
        if (updated) {
            await profile.save();
            console.log(`[USER SERVICE] Synced dummy info to real info for ${userId}`);
        }

        return res.status(200).json({
            userId: userId,
            name: profile.name,
            email: profile.email,
            role: role,
            phone: profile.phone,
            ...(role === 'DRIVER' ? {
                avatar: profile.avatar || null,
                address: profile.address || null,
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
        const { name, phone, licenseNumber, vehicleDetails } = req.body;

        console.log(`[USER SERVICE] Updating profile for ${userId} (${role}). Body:`, JSON.stringify(req.body));

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
            // Lazy create if not found (Self-healing)
            if (role === 'DRIVER') {
                profile = await DriverProfile.create({
                    driverId: userId,
                    name: name || req.headers['x-user-name'] || 'New Driver',
                    email: req.headers['x-user-email'] || `driver_${userId.substring(0, 8)}@system.com`,
                });
                console.log(`[USER SERVICE] Auto-created driver profile on update for ${userId}`);
            } else {
                profile = await UserProfile.create({
                    userId: userId,
                    name: name || req.headers['x-user-name'] || 'New Passenger',
                    email: req.headers['x-user-email'] || `user_${userId.substring(0, 8)}@system.com`,
                });
                console.log(`[USER SERVICE] Auto-created passenger profile on update for ${userId}`);
            }
        }

        if (name) profile.name = name;
        if (phone) {
            // Clean phone number
            const cleanPhone = phone.replace(/[\s\.\-]/g, '');
            if (cleanPhone && !/^[0-9]{9,11}$/.test(cleanPhone)) {
                return res.status(400).json({ error: 'Số điện thoại không hợp lệ (cần 9-11 chữ số)' });
            }
            if (cleanPhone) profile.phone = cleanPhone;
        }

        // Driver specific fields
        if (role === 'DRIVER') {
            if (req.body.avatar !== undefined) profile.avatar = req.body.avatar;
            if (req.body.address !== undefined) profile.address = req.body.address;

            if (licenseNumber) profile.licenseNumber = licenseNumber;

            if (vehicleDetails) {
                // Relaxed validation: only check plate if it's being set
                if (vehicleDetails.plate === '' && (!profile.vehicleDetails || !profile.vehicleDetails.plate)) {
                    // Only error if we have NO plate yet and they sent an empty one
                    // But if they just want to update address, don't block.
                }

                // Merge with existing details to avoid wiping out fields not sent
                profile.vehicleDetails = {
                    ...(profile.vehicleDetails || {}),
                    ...vehicleDetails
                };
            }
        }

        await profile.save();

        return res.status(200).json({
            userId: userId,
            name: profile.name,
            email: profile.email,
            role: role,
            phone: profile.phone,
            avatar: profile.avatar || null,
            address: profile.address || null,
            ...(role === 'DRIVER' ? {
                licenseNumber: profile.licenseNumber,
                vehicleDetails: profile.vehicleDetails
            } : {})
        });
    } catch (error) {
        console.error('[USER SERVICE] Update Profile Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getProfile,
    updateProfile
};
