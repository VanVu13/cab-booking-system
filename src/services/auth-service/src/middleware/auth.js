const { verifyToken } = require('../utils/jwt');

/**
 * Middleware to authenticate JWT token from Authorization header
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            error: 'Access denied. No token provided.'
        });
    }

    try {
        const decoded = verifyToken(token);

        // Check if it's an access token
        if (decoded.type !== 'access') {
            return res.status(401).json({
                error: 'Invalid token type. Access token required.'
            });
        }

        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            role: decoded.role
        };

        next();
    } catch (error) {
        return res.status(401).json({
            error: error.message || 'Invalid or expired token'
        });
    }
}

module.exports = {
    authenticateToken
};
