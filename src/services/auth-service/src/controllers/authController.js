const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const {
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
    storeRefreshToken,
    isRefreshTokenValid,
    revokeRefreshToken,
    revokeAllUserTokens
} = require('../utils/jwt');
const axios = require('axios');

const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || 'http://localhost:3004';

/**
 * Register a new user
 * POST /auth/register
 * For DRIVER role: requires additional profile info (phone, license, vehicle)
 */
async function register(req, res) {
    try {
        const { email, password, role, name, phone, licenseNumber, vehicleType, vehiclePlate, vehicleModel, vehicleColor } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const validRoles = ['PASSENGER', 'DRIVER', 'ADMIN'];
        const userRole = role ? role.toUpperCase() : 'PASSENGER';
        if (!validRoles.includes(userRole)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // DRIVER registration requires additional fields
        if (userRole === 'DRIVER') {
            if (!name || !phone || !licenseNumber || !vehicleType || !vehiclePlate || !vehicleModel || !vehicleColor) {
                return res.status(400).json({
                    error: 'Driver registration requires: name, phone, licenseNumber, vehicleType, vehiclePlate, vehicleModel, vehicleColor'
                });
            }
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const password_hash = await hashPassword(password);

        // DRIVER -> PENDING_APPROVAL, others -> ACTIVE
        const userStatus = userRole === 'DRIVER' ? 'PENDING_APPROVAL' : 'ACTIVE';

        const user = await User.create({
            email,
            password_hash,
            role: userRole,
            name: name || null,
            status: userStatus
        });

        // Create driver profile in driver-service
        if (userRole === 'DRIVER') {
            try {
                await axios.post(`${DRIVER_SERVICE_URL}/drivers/profile`, {
                    driverId: user.id,
                    phone,
                    licenseNumber,
                    vehicleType,
                    vehiclePlate,
                    vehicleModel,
                    vehicleColor
                });
                console.log(`✓ Driver profile created for user ${user.id}`);
            } catch (profileError) {
                console.error('Failed to create driver profile:', profileError.message);
                // Rollback user creation if profile fails
                await user.destroy();
                return res.status(500).json({ error: 'Failed to create driver profile. Please try again.' });
            }
        }

        // Response message based on role
        const message = userRole === 'DRIVER'
            ? 'Đăng ký thành công. Tài khoản của bạn đang chờ Admin xét duyệt.'
            : 'User registered successfully. Please login to continue.';

        return res.status(201).json({
            userId: user.id,
            role: user.role,
            status: user.status,
            message
        });

    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Login user
 * POST /auth/login
 * Security: PENDING_APPROVAL/REJECTED accounts get "Invalid credentials" (no info leak)
 */
async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        console.log(`[LOGIN ATTEMPT] Email: ${email}`);
        const user = await User.findOne({ where: { email } });

        if (!user) {
            console.log(`[LOGIN FAILED] User not found for email: ${email}`);
            return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        }

        const isMatch = await comparePassword(password, user.password_hash);
        if (!isMatch) {
            console.log(`[LOGIN FAILED] Password mismatch for user: ${user.id}`);
            return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        }

        // Status-based access control
        if (user.status !== 'ACTIVE') {
            // BLOCKED/SUSPENDED: inform user
            if (user.status === 'BLOCKED') {
                return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa vĩnh viễn.' });
            }
            if (user.status === 'SUSPENDED') {
                return res.status(403).json({ error: 'Tài khoản của bạn đang bị đình chỉ tạm thời.' });
            }

            // PENDING_APPROVAL/REJECTED: inform user of their specific status
            if (user.status === 'PENDING_APPROVAL') {
                return res.status(403).json({ error: 'Tài khoản của bạn đang chờ Admin xét duyệt.' });
            }
            if (user.status === 'REJECTED') {
                return res.status(403).json({ error: 'Tài khoản của bạn đã bị từ chối.' });
            }
        }

        // Generate tokens
        const accessToken = generateAccessToken(user.id, user.role, user.email, user.name);
        const refreshToken = generateRefreshToken(user.id, user.role, user.email, user.name);

        // Store refresh token in Redis
        await storeRefreshToken(user.id, refreshToken);

        return res.status(200).json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Refresh access token (with Rotation)
 * POST /auth/refresh
 */
async function refresh(req, res) {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        let decoded;
        try {
            decoded = verifyToken(refreshToken);
        } catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        if (decoded.type !== 'refresh') {
            return res.status(401).json({ error: 'Invalid token type' });
        }

        const isValid = await isRefreshTokenValid(decoded.userId, refreshToken);
        if (!isValid) {
            console.warn(`[SECURITY] Potential Refresh Token Reuse detected for user ${decoded.userId}! Revoking all sessions.`);
            await revokeAllUserTokens(decoded.userId);
            return res.status(401).json({ error: 'Token has been revoked or reused' });
        }

        const user = await User.findByPk(decoded.userId);
        if (!user || user.status !== 'ACTIVE') {
            await revokeRefreshToken(decoded.userId, refreshToken);
            return res.status(401).json({ error: 'User unavailable' });
        }

        await revokeRefreshToken(user.id, refreshToken);

        const accessToken = generateAccessToken(user.id, user.role, user.email, user.name);
        const refreshTokenNew = generateRefreshToken(user.id, user.role, user.email, user.name);

        await storeRefreshToken(user.id, refreshTokenNew);

        return res.status(200).json({
            accessToken: accessToken,
            refreshToken: refreshTokenNew
        });

    } catch (error) {
        console.error('Refresh error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Logout user
 */
async function logout(req, res) {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            const decoded = verifyToken(refreshToken);
            await revokeRefreshToken(decoded.userId, refreshToken);
        }
        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (e) {
        return res.status(200).json({ message: 'Logged out' });
    }
}

// ===================== ADMIN ENDPOINTS =====================

/**
 * GET /auth/admin/drivers
 * List all drivers with optional status filter
 * Protected: ADMIN only
 */
async function getDriversList(req, res) {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const whereClause = { role: 'DRIVER' };
        if (status) {
            const validStatuses = ['ACTIVE', 'BLOCKED', 'PENDING_APPROVAL', 'REJECTED', 'SUSPENDED'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status filter' });
            }
            whereClause.status = status;
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const { count, rows: drivers } = await User.findAndCountAll({
            where: whereClause,
            attributes: ['id', 'email', 'name', 'status', 'created_at', 'updated_at'],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        // Fetch driver profiles from driver-service
        const driversWithProfiles = await Promise.all(
            drivers.map(async (driver) => {
                const driverData = driver.toJSON();
                try {
                    const profileRes = await axios.get(`${DRIVER_SERVICE_URL}/drivers/${driver.id}/profile-internal`);
                    driverData.profile = profileRes.data;
                } catch (err) {
                    driverData.profile = null;
                }
                return driverData;
            })
        );

        return res.status(200).json({
            drivers: driversWithProfiles,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get drivers list error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * PATCH /auth/admin/drivers/:id/status
 * Update driver status (approve, reject, suspend, etc.)
 * Protected: ADMIN only
 */
async function updateDriverStatus(req, res) {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        const validStatuses = ['ACTIVE', 'BLOCKED', 'REJECTED', 'SUSPENDED'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const driver = await User.findOne({ where: { id, role: 'DRIVER' } });
        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }

        const previousStatus = driver.status;
        driver.status = status;
        await driver.save();

        // If rejected/suspended, save reason to driver-service
        if ((status === 'REJECTED' || status === 'SUSPENDED') && reason) {
            try {
                await axios.patch(`${DRIVER_SERVICE_URL}/drivers/${id}/rejection-reason`, { reason });
            } catch (err) {
                console.error('Failed to save rejection reason:', err.message);
            }
        }

        // If suspended or blocked, revoke all tokens
        if (status === 'BLOCKED' || status === 'SUSPENDED') {
            try {
                await revokeAllUserTokens(id);
                console.log(`✓ All tokens revoked for driver ${id}`);
            } catch (err) {
                console.error('Failed to revoke tokens:', err.message);
            }
        }

        console.log(`✓ Driver ${id} status changed: ${previousStatus} -> ${status}`);

        return res.status(200).json({
            message: `Driver status updated to ${status}`,
            driver: {
                id: driver.id,
                email: driver.email,
                name: driver.name,
                previousStatus,
                currentStatus: status
            }
        });

    } catch (error) {
        console.error('Update driver status error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    register,
    login,
    refresh,
    logout,
    getDriversList,
    updateDriverStatus
};
