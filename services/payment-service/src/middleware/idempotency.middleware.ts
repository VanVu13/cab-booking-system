import { Request, Response, NextFunction } from 'express';

export const idempotencyMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const idempotencyKey = req.headers['idempotency-key'] as string;

    if (!idempotencyKey) {
        res.status(400).json({
            error: 'Bad Request',
            message: 'Idempotency-Key header is required',
        });
        return;
    }

    // Attach to request for use in handlers
    (req as any).idempotencyKey = idempotencyKey;

    next();
};
