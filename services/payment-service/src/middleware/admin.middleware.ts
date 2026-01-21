import { Request, Response, NextFunction } from 'express';

export const adminMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const role = req.headers['x-role'] as string;

    if (role !== 'admin') {
        res.status(403).json({
            error: 'Forbidden',
            message: 'Admin access required',
        });
        return;
    }

    next();
};
