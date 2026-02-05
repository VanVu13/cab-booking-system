const jwt = require('jsonwebtoken');
const redis = require('../config/redis');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// Convert expiry string to seconds for Redis TTL (basic conversion)
function getExpiryInSeconds(expiryStr) {
    const unit = expiryStr.slice(-1);
    const value = parseInt(expiryStr.slice(0, -1));
    switch (unit) {
        case 'm': return value * 60;
        case 'h': return value * 60 * 60;
        case 'd': return value * 24 * 60 * 60;
        default: return value;
    }
}

const REFRESH_TTL = getExpiryInSeconds(REFRESH_EXPIRY);

function generateAccessToken(userId, role, email) {
    return jwt.sign(
        { userId, role, email, type: 'access' },
        JWT_SECRET,
        { expiresIn: ACCESS_EXPIRY }
    );
}

function generateRefreshToken(userId, role, email) {
    return jwt.sign(
        { userId, role, email, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: REFRESH_EXPIRY }
    );
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        }
        throw new Error('Invalid token');
    }
}

/**
 * Store refresh token in Redis
 */
async function storeRefreshToken(userId, token) {
    const key = `refresh_token:${userId}:${token}`;
    await redis.set(key, 'valid', 'EX', REFRESH_TTL);
}

/**
 * Check if refresh token is valid in Redis
 */
async function isRefreshTokenValid(userId, token) {
    const key = `refresh_token:${userId}:${token}`;
    const status = await redis.get(key);
    return status === 'valid';
}

/**
 * Revoke a specific refresh token
 */
async function revokeRefreshToken(userId, token) {
    const key = `refresh_token:${userId}:${token}`;
    await redis.del(key);
}

/**
 * Revoke all refresh tokens for a user
 */
async function revokeAllUserTokens(userId) {
    const stream = redis.scanStream({
        match: `refresh_token:${userId}:*`,
    });

    stream.on('data', async (keys) => {
        if (keys.length) {
            const pipeline = redis.pipeline();
            keys.forEach((key) => pipeline.del(key));
            await pipeline.exec();
        }
    });
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
    storeRefreshToken,
    isRefreshTokenValid,
    revokeRefreshToken,
    revokeAllUserTokens
};
