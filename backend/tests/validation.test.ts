import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.ts';

describe('Zod Request Validation & Error Shapes', () => {
  let adminToken: string;

  it('authenticates admin', async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@shopkart.com', password: 'AdminPassword123!' });
    adminToken = adminRes.body.token;
  });

  it('rejects invalid registration bodies with consistent 400 error shape', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: '', // Empty name violates min(1)
      email: 'invalid-email-format',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Validation failed/i);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid cart write payloads with 400 error shape', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: '', // empty
        quantity: -5, // non-positive
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Validation failed/i);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('rejects invalid order payloads (empty order items or missing address)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orderItems: [], // min 1 required
        paymentMethod: 'COD',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Validation failed/i);
  });

  it('rejects invalid coupon percentages (> 100%)', async () => {
    const res = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: `SUPER_${Date.now()}`,
        discountType: 'percentage',
        discountValue: 150, // > 100 not allowed
        expiryDate: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/cannot exceed 100/i);
  });

  it('rejects invalid product creation payloads (missing name, negative price)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: '',
        price: -50,
        category: 'Electronics',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Validation failed/i);
  });
});
