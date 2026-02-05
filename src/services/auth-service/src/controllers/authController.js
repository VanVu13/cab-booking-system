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

/**
 * Register a new user
 * POST /auth/register
 */
async function register(req, res) {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const validRoles = ['PASSENGER', 'DRIVER', 'ADMIN'];
        const userRole = role ? role.toUpperCase() : 'PASSENGER';
        if (!validRoles.includes(userRole)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const password_hash = await hashPassword(password);
        const user = await User.create({
            email,
            password_hash,
            role: userRole,
            status: 'ACTIVE'
        });

        // Generate tokens
        const accessToken = generateAccessToken(user.id, user.role, user.email);
        const refreshToken = generateRefreshToken(user.id, user.role, user.email);

        // Store refresh token in Redis
        await storeRefreshToken(user.id, refreshToken);

        return res.status(201).json({
            userId: user.id,
            role: user.role,
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Login user
 * POST /auth/login
 */
async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user || !(await comparePassword(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.status === 'BLOCKED') {
            return res.status(403).json({ error: 'Account blocked' });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user.id, user.role, user.email);
        const refreshToken = generateRefreshToken(user.id, user.role, user.email);

        // Store refresh token in Redis
        await storeRefreshToken(user.id, refreshToken);

        return res.status(200).json({
            userId: user.id,
            role: user.role,
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

        // 1. Verify token structure and signature
        let decoded;
        try {
            decoded = verifyToken(refreshToken);
        } catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        if (decoded.type !== 'refresh') {
            return res.status(401).json({ error: 'Invalid token type' });
        }

        // 2. Check if token exists in Redis (Detect Reuse)
        const isValid = await isRefreshTokenValid(decoded.userId, refreshToken);
        if (!isValid) {
            console.warn(`[SECURITY] Potential Refresh Token Reuse detected for user ${decoded.userId}! Revoking all sessions.`);
            await revokeAllUserTokens(decoded.userId);
            return res.status(401).json({ error: 'Token has been revoked or reused' });
        }

        // 3. Check user status
        const user = await User.findByPk(decoded.userId);
        if (!user || user.status === 'BLOCKED') {
            await revokeRefreshToken(decoded.userId, refreshToken);
            return res.status(401).json({ error: 'User unavailable' });
        }

        // 4. Token Rotation: 
        // - Revoke the current refresh token
        // - Issue a NEW access token AND a NEW refresh token
        await revokeRefreshToken(user.id, refreshToken);

        const accessToken = generateAccessToken(user.id, user.role, user.email);
        const refreshTokenNew = generateRefreshToken(user.id, user.role, user.email);

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
        return res.status(200).json({ message: 'Logged out' }); // Silent fail
    }
}

module.exports = {
    register,
    login,
    refresh,
    logout
};
