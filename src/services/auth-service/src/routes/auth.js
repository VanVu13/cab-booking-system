const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Validation middleware
 */
function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
}

/**
 * Middleware: Require ADMIN role
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

/**
 * POST /auth/register
 * Register a new user (DRIVER requires all profile fields)
 */
router.post(
    '/register',
    [
        body('email')
            .isEmail()
            .withMessage('Valid email is required')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long'),
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2 })
            .withMessage('Name must be at least 2 characters long'),
        body('role')
            .optional()
            .isIn(['PASSENGER', 'DRIVER', 'ADMIN'])
            .withMessage('Role must be PASSENGER, DRIVER, or ADMIN')
    ],
    validate,
    authController.register
);

/**
 * POST /auth/login
 * Login user
 */
router.post(
    '/login',
    [
        body('email')
            .isEmail()
            .withMessage('Valid email is required')
            .normalizeEmail(),
        body('password')
            .notEmpty()
            .withMessage('Password is required')
    ],
    validate,
    authController.login
);

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post(
    '/refresh',
    [
        body('refreshToken')
            .notEmpty()
            .withMessage('Refresh token is required')
    ],
    validate,
    authController.refresh
);

/**
 * POST /auth/logout
 * Logout user
 */
router.post('/logout', authController.logout);

// ===================== ADMIN ROUTES =====================

/**
 * GET /auth/admin/drivers
 * List all drivers with optional status filter
 */
router.get(
    '/admin/drivers',
    authenticateToken,
    requireAdmin,
    authController.getDriversList
);

/**
 * PATCH /auth/admin/drivers/:id/status
 * Update driver approval status
 */
router.patch(
    '/admin/drivers/:id/status',
    authenticateToken,
    requireAdmin,
    [
        body('status')
            .isIn(['ACTIVE', 'BLOCKED', 'REJECTED', 'SUSPENDED'])
            .withMessage('Status must be ACTIVE, BLOCKED, REJECTED, or SUSPENDED'),
        body('reason')
            .optional()
            .trim()
    ],
    validate,
    authController.updateDriverStatus
);

module.exports = router;
