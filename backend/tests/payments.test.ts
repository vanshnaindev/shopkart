import { describe, it, expect } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../src/index.ts';
import { db } from '../src/db.ts';

describe('Payment Processing & Signature Security', () => {
  let customerToken: string;
  let testOrder: any;

  it('sets up customer and test order', async () => {
    const customerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@shopkart.com', password: 'Customer123!' });
    expect(customerRes.status).toBe(200);
    customerToken = customerRes.body.token;

    const prod = (await db.products.find({ activeOnly: true }))[0];

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ productId: prod._id, quantity: 1 }],
        shippingAddress: {
          fullName: 'Pay Tester',
          phone: '9876543210',
          street: '1 Pay St',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          type: 'home',
        },
        paymentMethod: 'Prepaid',
      });
    expect(orderRes.status).toBe(201);
    testOrder = orderRes.body.order;
  });

  it('creates payment order successfully', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        amount: testOrder.totalAmount,
        receipt: testOrder.orderNumber,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orderId).toBeDefined();
  });

  it('rejects tampered or fraudulent payment signatures with timing-safe check', async () => {
    const fakeRazorpayOrderId = 'order_fake_123456';
    const fakePaymentId = 'pay_fake_987654';
    const invalidSignature = 'bad_forged_signature_00000000000000000000000000000000';

    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId: testOrder._id,
        razorpay_order_id: fakeRazorpayOrderId,
        razorpay_payment_id: fakePaymentId,
        razorpay_signature: invalidSignature,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/signature/i);
  });

  it('accepts authentic HMAC signature and transitions order to Paid', async () => {
    const razorpayOrderId = 'order_valid_' + Date.now();
    const razorpayPaymentId = 'pay_valid_' + Date.now();

    // Compute legitimate HMAC SHA256 signature using RAZORPAY_KEY_SECRET or SANDBOX_SECRET
    const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_shopkart';
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId: testOrder._id,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: validSignature,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order.paymentStatus).toBe('Paid');
  });
});
