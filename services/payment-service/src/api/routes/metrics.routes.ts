import { Router, Request, Response } from 'express';
import { register } from '../../utils/metrics';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        res.set('Content-Type', register.contentType);
        const metrics = await register.metrics();
        res.send(metrics);
    } catch (error: any) {
        res.status(500).json({
            error: 'Metrics Error',
            message: error.message,
        });
    }
});

export default router;
