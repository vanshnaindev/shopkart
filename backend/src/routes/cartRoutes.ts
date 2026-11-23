import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../db.ts';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';
import { validate } from '../middleware/validation.ts';

const router = Router();

const addItemSchema = z.object({
  productId: z.string().min(1, 'ProductId is required.'),
  quantity: z.number().int().positive().optional().default(1),
});

const updateItemSchema = z.object({
  quantity: z.number().int().positive(),
});

// Get cart
router.get('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cart = await db.carts.findByUserId(req.user!._id);
    res.json({
      success: true,
      cart,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to retrieve cart.' });
  }
});

// Add item to cart
router.post(
  '/',
  requireAuth,
  validate({ body: addItemSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { productId, quantity = 1 } = req.body;

      const product = await db.products.findById(productId);
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found.' });
        return;
      }

      const userCart = await db.carts.findByUserId(req.user!._id);
      const existing = userCart.items.find((i) => i.productId === productId);
      const currentQty = existing ? existing.quantity : 0;
      if (currentQty + Number(quantity) > product.stock) {
        res.status(400).json({
          success: false,
          message: `Only ${product.stock} units available in stock.`,
        });
        return;
      }

      const cart = await db.carts.addItem(req.user!._id, productId, Number(quantity));
      res.json({
        success: true,
        message: 'Item added to cart.',
        cart,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to add item to cart.' });
    }
  }
);

// Update item quantity
router.put(
  '/:productId',
  requireAuth,
  validate({ body: updateItemSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { quantity } = req.body;
      const { productId } = req.params;

      const product = await db.products.findById(productId);
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found.' });
        return;
      }

      if (Number(quantity) > product.stock) {
        res.status(400).json({
          success: false,
          message: `Only ${product.stock} units available in stock.`,
        });
        return;
      }

      const cart = await db.carts.updateItem(req.user!._id, productId, Number(quantity));
      res.json({
        success: true,
        message: 'Cart updated.',
        cart,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to update cart.' });
    }
  }
);

// Remove item from cart
router.delete(
  '/:productId',
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const cart = await db.carts.removeItem(req.user!._id, req.params.productId);
      res.json({
        success: true,
        message: 'Item removed from cart.',
        cart,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to remove item.' });
    }
  }
);

// Clear entire cart
router.delete('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await db.carts.clearCart(req.user!._id);
    res.json({
      success: true,
      message: 'Cart cleared successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to clear cart.' });
  }
});

export default router;
