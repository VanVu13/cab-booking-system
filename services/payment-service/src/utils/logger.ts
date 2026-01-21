import pino from 'pino';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    },
});

export const createLogger = (context: string) => {
    return logger.child({ context });
};

export const createRequestLogger = (correlationId: string) => {
    return logger.child({ correlationId });
};

export default logger;
