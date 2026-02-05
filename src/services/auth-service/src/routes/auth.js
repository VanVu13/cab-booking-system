const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');

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
 * POST /auth/register
 * Register a new user
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

module.exports = router;
