import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../db.ts';
import { AuthRequest, requireAuth, requireAdmin } from '../middleware/auth.ts';
import { validate } from '../middleware/validation.ts';

const router = Router();

const createReviewSchema = z.object({
  productId: z.string().min(1, 'ProductId, rating, and review comment are required.'),
  rating: z.number().min(1).max(5),
  comment: z.string().trim().min(1, 'ProductId, rating, and review comment are required.'),
  title: z.string().optional(),
});

// Admin: Get all reviews
router.get('/', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reviews = await db.reviews.find();
    res.json({ success: true, reviews });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve reviews.' });
  }
});

// Get reviews for a product
router.get('/:productId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reviews = await db.reviews.findByProductId(req.params.productId);
    res.json({ success: true, reviews });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve product reviews.' });
  }
});

// Add review
router.post(
  '/',
  requireAuth,
  validate({ body: createReviewSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { productId, rating, title, comment } = req.body;

      const product = await db.products.findById(productId);
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found.' });
        return;
      }

      const review = await db.reviews.create({
        productId,
        userId: req.user!._id,
        userName: req.user!.name,
        rating: Number(rating),
        title: title || '',
        comment: comment.trim(),
      });

      res.status(201).json({
        success: true,
        message: 'Review posted successfully. Thank you for your feedback!',
        review,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to post review.' });
    }
  }
);

// Admin: Moderate review (Approve / Hide)
router.patch(
  '/:id/approve',
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { isApproved } = req.body;
      const success = await db.reviews.approve(req.params.id, Boolean(isApproved));
      if (!success) {
        res.status(404).json({ success: false, message: 'Review not found.' });
        return;
      }
      res.json({
        success: true,
        message: `Review ${isApproved ? 'approved' : 'hidden'} successfully.`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to update review status.' });
    }
  }
);

// Admin: Delete review
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const success = await db.reviews.delete(req.params.id);
    if (!success) {
      res.status(404).json({ success: false, message: 'Review not found.' });
      return;
    }
    res.json({ success: true, message: 'Review deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to delete review.' });
  }
});

export default router;
