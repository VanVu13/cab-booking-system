const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    // Log error
    logger.error({
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        body: req.body,
        params: req.params,
        query: req.query
    });

    // Default error
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Production vs development error response
    const response = {
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    };

    // Remove stack trace in production
    if (process.env.NODE_ENV === 'production') {
        delete response.stack;
    }

    res.status(statusCode).json(response);
};

// 404 handler middleware
const notFoundHandler = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

module.exports = { errorHandler, notFoundHandler };