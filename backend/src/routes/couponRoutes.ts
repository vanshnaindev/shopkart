import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../db.ts';
import { AuthRequest, requireAdmin } from '../middleware/auth.ts';
import { validate } from '../middleware/validation.ts';

const router = Router();

const validateCouponSchema = z.object({
  code: z.string().trim().min(1, 'Coupon code is required.'),
  cartTotal: z.number().optional(),
});

const createCouponSchema = z.object({
  code: z.string().trim().min(1, 'Code, discount type, and value are required.'),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive('Discount value must be a positive number.'),
  minimumOrderAmount: z.number().optional(),
  maxDiscount: z.number().optional(),
  expiryDate: z.string().min(1, 'Expiry date is required.'),
  usageLimit: z.number().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Get public coupons
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const coupons = await db.coupons.find(true);
    res.json({ success: true, coupons });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Validate coupon against order subtotal
router.post(
  '/validate',
  validate({ body: validateCouponSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { code, cartTotal } = req.body;
      if (!code) {
        res.status(400).json({ success: false, message: 'Coupon code is required.' });
        return;
      }

      const coupon = await db.coupons.findByCode(code);
      if (!coupon || !coupon.isActive) {
        res.status(404).json({ success: false, message: 'Invalid or inactive coupon code.' });
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

      const subtotal = Number(cartTotal) || 0;
      if (subtotal < coupon.minimumOrderAmount) {
        res.status(400).json({
          success: false,
          message: `Minimum order amount of ₹${coupon.minimumOrderAmount.toLocaleString()} required for this coupon.`,
        });
        return;
      }

      let discount = 0;
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

      res.json({
        success: true,
        valid: true,
        coupon,
        discountAmount: discount,
        message: `Coupon ${coupon.code} applied! You saved ₹${discount.toLocaleString()}.`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Admin: Get all coupons
router.get('/all', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const coupons = await db.coupons.find(false);
    res.json({ success: true, coupons });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Create coupon
router.post(
  '/',
  requireAdmin,
  validate({ body: createCouponSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        code,
        discountType,
        discountValue,
        minimumOrderAmount,
        maxDiscount,
        expiryDate,
        usageLimit,
        description,
        isActive,
      } = req.body;
      if (
        !code ||
        !String(code).trim() ||
        !discountType ||
        discountValue === undefined ||
        discountValue === null
      ) {
        res
          .status(400)
          .json({ success: false, message: 'Code, discount type, and value are required.' });
        return;
      }

      const normCode = String(code).trim().toUpperCase();
      const existing = await db.coupons.findByCode(normCode);
      if (existing) {
        res.status(409).json({ success: false, message: 'Coupon code already exists.' });
        return;
      }

      const numValue = Number(discountValue);
      if (isNaN(numValue) || numValue <= 0) {
        res
          .status(400)
          .json({ success: false, message: 'Discount value must be a positive number.' });
        return;
      }

      if (discountType === 'percentage' && numValue > 100) {
        res
          .status(400)
          .json({ success: false, message: 'Percentage discount cannot exceed 100%.' });
        return;
      }

      if (!expiryDate) {
        res.status(400).json({ success: false, message: 'Expiry date is required.' });
        return;
      }

      const expiryTime = new Date(expiryDate).getTime();
      if (isNaN(expiryTime) || expiryTime <= Date.now()) {
        res.status(400).json({ success: false, message: 'Expiry date must be in the future.' });
        return;
      }

      const coupon = await db.coupons.create({
        code: normCode,
        discountType,
        discountValue: numValue,
        minimumOrderAmount: Number(minimumOrderAmount || 0),
        maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
        expiryDate: new Date(expiryDate).toISOString(),
        usageLimit: Number(usageLimit || 1000),
        description,
        isActive: isActive !== false,
      });

      res.status(201).json({ success: true, message: 'Coupon created successfully.', coupon });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Admin: Update coupon
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const coupon = await db.coupons.findById(req.params.id);
    if (!coupon) {
      res.status(404).json({ success: false, message: 'Coupon not found.' });
      return;
    }

    const { code, discountType, discountValue, expiryDate } = req.body;
    if (code) {
      const normCode = String(code).trim().toUpperCase();
      const existing = await db.coupons.findByCode(normCode);
      if (existing && existing._id !== coupon._id) {
        res.status(409).json({ success: false, message: 'Coupon code already exists.' });
        return;
      }
    }

    const type = discountType || coupon.discountType;
    if (discountValue !== undefined) {
      const numVal = Number(discountValue);
      if (isNaN(numVal) || numVal <= 0) {
        res
          .status(400)
          .json({ success: false, message: 'Discount value must be a positive number.' });
        return;
      }
      if (type === 'percentage' && numVal > 100) {
        res
          .status(400)
          .json({ success: false, message: 'Percentage discount cannot exceed 100%.' });
        return;
      }
    }

    if (expiryDate) {
      const expiryTime = new Date(expiryDate).getTime();
      if (isNaN(expiryTime) || expiryTime <= Date.now()) {
        res.status(400).json({ success: false, message: 'Expiry date must be in the future.' });
        return;
      }
    }

    const updated = await db.coupons.update(coupon._id, req.body);
    res.json({ success: true, message: 'Coupon updated successfully.', coupon: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Delete coupon
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const success = await db.coupons.delete(req.params.id);
    if (!success) {
      res.status(404).json({ success: false, message: 'Coupon not found.' });
      return;
    }
    res.json({ success: true, message: 'Coupon deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
