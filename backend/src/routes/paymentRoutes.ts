import { Router, Response } from 'express';
import crypto from 'crypto';
import { AuthRequest, requireAuth } from '../middleware/auth.ts';
import { paymentRateLimiter } from '../middleware/rateLimiter.ts';
import { db } from '../db.ts';

const router = Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const SANDBOX_SECRET = 'rzp_test_secret_shopkart';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Create Razorpay Order
router.post(
  '/create-order',
  requireAuth,
  paymentRateLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { amount, currency = 'INR', receipt } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({ success: false, message: 'Valid amount is required.' });
        return;
      }

      const amountInPaise = Math.round(Number(amount) * 100);

      // If real credentials are set up, call real Razorpay REST API
      if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
        try {
          const authHeader =
            'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
          const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: amountInPaise,
              currency,
              receipt: receipt || 'rcpt_' + Date.now(),
            }),
          });

          const rzpData: any = await response.json();
          if (!response.ok) {
            res.status(response.status).json({
              success: false,
              message: rzpData.error?.description || 'Razorpay order creation failed',
              error: rzpData,
            });
            return;
          }

          res.json({
            success: true,
            orderId: rzpData.id,
            amount: rzpData.amount,
            currency: rzpData.currency,
            key: RAZORPAY_KEY_ID,
            isDemoMode: false,
          });
          return;
        } catch (fetchErr: any) {
          res.status(502).json({
            success: false,
            message: 'Failed to communicate with Razorpay API: ' + fetchErr.message,
          });
          return;
        }
      }

      // Explicitly labeled sandbox mode when keys are empty
      const sandboxOrderId = 'order_sandbox_' + crypto.randomBytes(8).toString('hex');
      res.json({
        success: true,
        orderId: sandboxOrderId,
        amount: amountInPaise,
        currency,
        key: 'rzp_test_shopkart_demo',
        isDemoMode: true,
        message:
          'Razorpay Sandbox Mode active. Set RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in .env for production payments.',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Verify Payment
router.post(
  '/verify',
  requireAuth,
  paymentRateLimiter,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, order_id } =
        req.body;

      if (!razorpay_order_id || !razorpay_payment_id) {
        res
          .status(400)
          .json({ success: false, message: 'Payment transaction details are required.' });
        return;
      }

      if (!razorpay_signature) {
        res.status(400).json({
          success: false,
          verified: false,
          message: 'Payment signature is required.',
        });
        return;
      }

      const payload = `${razorpay_order_id}|${razorpay_payment_id}`;

      if (RAZORPAY_KEY_SECRET) {
        const generatedSignature = crypto
          .createHmac('sha256', RAZORPAY_KEY_SECRET)
          .update(payload)
          .digest('hex');

        if (!safeCompare(generatedSignature, razorpay_signature)) {
          res.status(400).json({
            success: false,
            verified: false,
            message: 'Razorpay payment signature mismatch. Potential tampering detected.',
          });
          return;
        }
      } else {
        // Sandbox mode: verify with sandbox secret OR accept demo token for UI
        const sandboxHmac = crypto
          .createHmac('sha256', SANDBOX_SECRET)
          .update(payload)
          .digest('hex');

        const isHmacValid = safeCompare(sandboxHmac, razorpay_signature);
        const isDemoTokenValid = safeCompare('demo_valid_signature_token', razorpay_signature);

        if (!isHmacValid && !isDemoTokenValid) {
          res.status(400).json({
            success: false,
            verified: false,
            message: 'Razorpay payment signature mismatch. Potential tampering detected.',
          });
          return;
        }
      }

      // Mark the order Paid only after verification succeeds
      let order = null;
      const targetOrderId = orderId || order_id;
      if (targetOrderId) {
        order = await db.orders.findById(targetOrderId);
        if (!order) {
          res.status(404).json({ success: false, message: 'Order not found.' });
          return;
        }

        if (order.userId !== req.user!._id && req.user!.role !== 'admin') {
          res.status(403).json({ success: false, message: 'Unauthorized access to order.' });
          return;
        }

        order.paymentStatus = 'Paid';
        order.paymentReference = razorpay_payment_id;
        await db.orders.update(order._id, {
          paymentStatus: 'Paid',
          paymentReference: razorpay_payment_id,
        });
      }

      res.json({
        success: true,
        verified: true,
        message: 'Payment verified successfully.',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        order: order || undefined,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
