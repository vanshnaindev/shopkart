import { Router, Response } from 'express';
import { resetDatabase } from '../db.ts';
import { AuthRequest } from '../middleware/auth.ts';

const router = Router();

// Reset database to pristine seed data
router.post('/reset', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({
        success: false,
        message: 'Database reset is blocked in production environment.',
      });
      return;
    }

    await resetDatabase();
    res.json({
      success: true,
      message:
        'Database successfully re-seeded with demo categories, products, coupons, and orders.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
