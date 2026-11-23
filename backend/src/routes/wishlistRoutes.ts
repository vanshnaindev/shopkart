import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../db.ts';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';
import { validate } from '../middleware/validation.ts';

const router = Router();

const toggleWishlistSchema = z.object({
  productId: z.string().min(1, 'ProductId is required.'),
});

// Get user wishlist
router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const wishlist = await db.wishlists.findByUserId(req.user!._id);
    res.json({
      success: true,
      wishlist,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve wishlist.' });
  }
});

// Toggle product in wishlist
router.post(
  '/toggle',
  requireAuth,
  validate({ body: toggleWishlistSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { productId } = req.body;
      const result = await db.wishlists.toggle(req.user!._id, productId);
      res.json({
        success: true,
        inWishlist: result.inWishlist,
        message: result.inWishlist ? 'Added to Wishlist' : 'Removed from Wishlist',
        productIds: result.productIds,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to update wishlist.' });
    }
  }
);

// Remove product from wishlist
router.delete(
  '/:productId',
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await db.wishlists.toggle(req.user!._id, req.params.productId);
      if (result.inWishlist) {
        await db.wishlists.toggle(req.user!._id, req.params.productId);
      }
      const wishlist = await db.wishlists.findByUserId(req.user!._id);
      res.json({
        success: true,
        message: 'Item removed from wishlist.',
        wishlist,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to remove from wishlist.' });
    }
  }
);

export default router;
