const winston = require('winston');
const config = require('../config/config');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: config.nodeEnv === 'development' ? 'debug' : 'info',
    format: logFormat,
    defaultMeta: { service: config.serviceName },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(
                    ({ timestamp, level, message, service }) => {
                        return `[${timestamp}] ${service} ${level}: ${message}`;
                    }
                )
            ),
        }),
        // File transport (only in production)
        ...(config.nodeEnv === 'production' ? [
            new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
            new winston.transports.File({ filename: 'logs/combined.log' }),
        ] : []),
    ],
});

// Create a stream object for Morgan
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    },
};

module.exports = logger;