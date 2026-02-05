/**
 * Middleware to check if user has required roles
 * @param {string[]} requiredRoles - Array of roles allowed to access the route
 */
function authorizeRoles(...requiredRoles) {
    return (req, res, next) => {
        // req.user is set by authenticateToken middleware
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        if (!requiredRoles.includes(req.user.role)) {
            console.log(`[RBAC] Access denied for user ${req.user.userId}. Role ${req.user.role} not in [${requiredRoles}]`);
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to access this resource'
            });
        }

        console.log(`[RBAC] Access granted for user ${req.user.userId} (${req.user.role})`);
        next();
    };
}

module.exports = {
    authorizeRoles
};
