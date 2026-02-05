const { body, validationResult } = require('express-validator');

/**
 * Middleware to handle validation results
 */
const validateResults = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(`[VALIDATION] Request failed validation: ${req.method} ${req.url}`);
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

/**
 * Validation schema for User Registration
 */
const registerSchema = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('role').optional().isIn(['PASSENGER', 'DRIVER', 'ADMIN']).withMessage('Invalid role'),
    validateResults
];

/**
 * Validation schema for User Login
 */
const loginSchema = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validateResults
];

module.exports = {
    registerSchema,
    loginSchema
};
