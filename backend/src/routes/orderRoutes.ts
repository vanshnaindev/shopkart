import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../db.ts';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';
import { validate } from '../middleware/validation.ts';
import { ICoupon, IOrderItem } from '../types.ts';

const router = Router();

// Zod Validation Schemas
const orderItemInputSchema = z.object({
  productId: z.string().min(1, 'Product ID is required.'),
  quantity: z.number().int('Quantity must be an integer.').positive('Quantity must be positive.'),
  name: z.string().optional(),
  price: z.number().optional(),
});

const createOrderSchema = z
  .object({
    items: z.array(orderItemInputSchema).optional(),
    orderItems: z.array(orderItemInputSchema).optional(),
    shippingAddress: z.object({
      fullName: z.string().min(1, 'Valid shipping address is required.'),
      street: z.string().min(1, 'Valid shipping address is required.'),
      pincode: z.string().min(1, 'Valid shipping address is required.'),
      city: z.string().optional(),
      state: z.string().optional(),
      phone: z.string().optional(),
      type: z.string().optional(),
      isDefault: z.boolean().optional(),
    }),
    paymentMethod: z.string().optional(),
    couponCode: z.string().optional(),
  })
  .refine(
    (data) =>
      (data.items && data.items.length > 0) || (data.orderItems && data.orderItems.length > 0),
    {
      message: 'Cart items are required to place an order.',
      path: ['items'],
    }
  );

const cancelOrderSchema = z.object({
  reason: z.string().optional(),
});

const returnOrderSchema = z.object({
  reason: z.string().optional(),
});

// Mutex to ensure atomic stock check and reservation for concurrent orders in JSON mode
class AsyncLock {
  private queue: Promise<void> = Promise.resolve();

  acquire(): Promise<() => void> {
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current = this.queue;
    this.queue = this.queue.then(() => next);
    return current.then(() => release);
  }
}

const orderLock = new AsyncLock();

// Place order
router.post(
  '/',
  requireAuth,
  validate({ body: createOrderSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const release = await orderLock.acquire();
    try {
      const { shippingAddress, paymentMethod = 'COD', couponCode } = req.body;
      const items = req.body.items || req.body.orderItems;

      if (!items || !Array.isArray(items) || items.length === 0) {
        res
          .status(400)
          .json({ success: false, message: 'Cart items are required to place an order.' });
        return;
      }

      if (
        !shippingAddress ||
        !shippingAddress.fullName ||
        !shippingAddress.street ||
        !shippingAddress.pincode
      ) {
        res.status(400).json({ success: false, message: 'Valid shipping address is required.' });
        return;
      }

      // Step 1: Validate all items and verify stock availability before any decrement
      let subtotal = 0;
      const orderItems: IOrderItem[] = [];

      for (const item of items) {
        if (
          !item.productId ||
          typeof item.quantity !== 'number' ||
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0
        ) {
          res.status(400).json({ success: false, message: 'Invalid item quantity or product ID.' });
          return;
        }

        const prod = await db.products.findById(item.productId);
        if (!prod || prod.isActive === false) {
          res
            .status(404)
            .json({ success: false, message: `Product ${item.name || item.productId} not found.` });
          return;
        }

        if (prod.stock < item.quantity) {
          res.status(400).json({
            success: false,
            message: `Insufficient stock for "${prod.name}". Only ${prod.stock} units remaining.`,
          });
          return;
        }

        // Always read price from database, never trust client price
        const itemPrice = prod.price;
        subtotal += itemPrice * item.quantity;
        orderItems.push({
          productId: prod._id,
          name: prod.name,
          image: (prod.images && prod.images[0]) || '',
          price: itemPrice,
          originalPrice: prod.originalPrice,
          quantity: item.quantity,
        });
      }

      // Step 2: Validate coupon if provided
      let discount = 0;
      let appliedCoupon: ICoupon | null = null;

      if (couponCode) {
        const coupon = await db.coupons.findByCode(couponCode);
        if (!coupon || !coupon.isActive) {
          res.status(400).json({ success: false, message: 'Invalid or inactive coupon code.' });
          return;
        }

        if (new Date(coupon.expiryDate).getTime() < Date.now()) {
          res.status(400).json({ success: false, message: 'This coupon has expired.' });
          return;
        }

        if (coupon.usedCount >= coupon.usageLimit) {
          res.status(400).json({ success: false, message: 'Coupon usage limit exceeded.' });
          return;
        }

        if (subtotal < coupon.minimumOrderAmount) {
          res.status(400).json({
            success: false,
            message: `Minimum order amount of ₹${coupon.minimumOrderAmount.toLocaleString()} required for this coupon.`,
          });
          return;
        }

        if (coupon.discountType === 'percentage') {
          discount = Math.round((subtotal * coupon.discountValue) / 100);
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
        } else {
          discount = coupon.discountValue;
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
          if (discount > subtotal) {
            discount = subtotal;
          }
        }

        appliedCoupon = coupon;
      }

      // Step 3: Server-side shipping and totalAmount calculation
      const shippingCharge = subtotal > 500 ? 0 : 40;
      const totalAmount = Math.max(0, subtotal - discount + shippingCharge);

      // Step 4: Create order (atomically decrements stock and writes inventory logs)
      const user = req.user!;
      const order = await db.orders.create({
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone || shippingAddress.phone,
        orderItems,
        shippingAddress,
        paymentMethod,
        paymentStatus: 'Pending',
        subtotal,
        discount,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        shippingCharge,
        totalAmount,
        orderStatus: 'Confirmed',
      });

      // Step 5: Increment coupon usage only when order is placed
      if (appliedCoupon) {
        await db.coupons.incrementUsage(appliedCoupon.code);
      }

      // Step 6: Clear the user's cart
      await db.carts.clearCart(user._id);

      res.status(201).json({
        success: true,
        message: 'Order placed successfully!',
        order,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    } finally {
      release();
    }
  }
);

// My orders
router.get('/my-orders', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await db.orders.find({ userId: req.user!._id });
    res.json({
      success: true,
      orders,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get order details
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await db.orders.findById(req.params.id);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    // Check ownership unless admin
    if (order.userId !== req.user!._id && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Unauthorized access to order details.' });
      return;
    }

    res.json({
      success: true,
      order,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Cancel order (eligible only before Shipped: Pending, Confirmed, Processing)
router.patch(
  '/:id/cancel',
  requireAuth,
  validate({ body: cancelOrderSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const order = await db.orders.findById(req.params.id);
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found.' });
        return;
      }

      if (order.userId !== req.user!._id && req.user!.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Unauthorized access to order.' });
        return;
      }

      if (!['Pending', 'Confirmed', 'Processing'].includes(order.orderStatus)) {
        res.status(400).json({
          success: false,
          message: `Order cannot be cancelled because it is already ${order.orderStatus}. Cancellations are only permitted before shipping.`,
        });
        return;
      }

      const { reason = 'Cancelled by customer' } = req.body;
      order.cancelReason = reason;
      const updated = await db.orders.cancel(order._id, reason, req.user!.name || 'Customer');

      res.json({
        success: true,
        message: 'Order cancelled successfully and stock restored.',
        order: updated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Return request (allowed only when Delivered)
router.patch(
  '/:id/return',
  requireAuth,
  validate({ body: returnOrderSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const order = await db.orders.findById(req.params.id);
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found.' });
        return;
      }

      if (order.userId !== req.user!._id && req.user!.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Unauthorized access to order.' });
        return;
      }

      if (order.orderStatus !== 'Delivered') {
        res.status(400).json({
          success: false,
          message: 'Return can only be initiated for delivered orders.',
        });
        return;
      }

      const { reason = 'Return requested by customer' } = req.body;
      order.returnReason = reason;
      const updated = await db.orders.updateStatus(
        order._id,
        'Return Requested',
        reason,
        req.user!.name || 'Customer'
      );

      res.json({
        success: true,
        message: 'Return request submitted. Our executive will inspect and arrange pickup.',
        order: updated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
