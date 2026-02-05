const { verifyToken } = require('../utils/jwt');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = verifyToken(token);
        if (decoded.type !== 'access') {
            return res.status(401).json({ error: 'Invalid token type. Access token required.' });
        }

        // Set user info on request object
        req.user = { userId: decoded.userId, role: decoded.role, email: decoded.email };

        // Set headers for downstream
        req.headers['x-user-id'] = decoded.userId;
        req.headers['x-user-role'] = decoded.role;
        req.headers['x-user-email'] = decoded.email || '';

        next();
    } catch (error) {
        return res.status(401).json({ error: error.message || 'Invalid or expired token' });
    }
}

function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const decoded = verifyToken(token);
            req.user = { userId: decoded.userId, role: decoded.role };
            req.headers['x-user-id'] = decoded.userId;
            req.headers['x-user-role'] = decoded.role;
        } catch (e) {
            // Ignore errors for optional auth
        }
    }
    next();
}

module.exports = { authenticateToken, optionalAuth };
