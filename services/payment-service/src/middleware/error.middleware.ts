import { Request, Response } from 'express';
import { createRequestLogger } from '../utils/logger';

export const errorMiddleware = (
    err: any,
    req: Request,
    res: Response
): void => {
    const correlationId = (req as any).correlationId || 'unknown';
    const logger = createRequestLogger(correlationId);

    logger.error(
        {
            error: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
        },
        'Request error'
    );

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        error: err.name || 'Error',
        message,
        correlationId,
    });
};
