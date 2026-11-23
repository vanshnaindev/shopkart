import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.ts';

describe('Coupon Validation and Administration', () => {
  let adminToken: string;
  let customerToken: string;

  it('authenticates admin and customer', async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@shopkart.com', password: 'AdminPassword123!' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.token;

    const customerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@shopkart.com', password: 'Customer123!' });
    expect(customerRes.status).toBe(200);
    customerToken = customerRes.body.token;
  });

  it('validates seeded coupon and correctly calculates discount with cap', async () => {
    // SHOPKART15 is 15% off, max 1500, min 1999
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({ code: 'SHOPKART15', cartTotal: 3000 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // 15% of 3000 = 450
    expect(res.body.discountAmount).toBe(450);

    // Test maxDiscount cap: 15% of 20000 = 3000, capped at 1500
    const resCap = await request(app)
      .post('/api/coupons/validate')
      .send({ code: 'SHOPKART15', cartTotal: 20000 });
    expect(resCap.body.discountAmount).toBe(1500);
  });

  it('rejects coupon when minimumOrderAmount is not met', async () => {
    // FESTIVE25 has min order 2500
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({ code: 'FESTIVE25', cartTotal: 500 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/minimum/i);
  });

  it('admin creates a new coupon with validation', async () => {
    const code = `TESTCPN_${Date.now()}`;
    const createRes = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code,
        discountType: 'percentage',
        discountValue: 20,
        maxDiscount: 500,
        minimumOrderAmount: 1000,
        usageLimit: 10,
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Vitest Test Coupon',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.coupon.code).toBe(code);

    // Duplicate code must be rejected
    const dupRes = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code,
        discountType: 'fixed',
        discountValue: 100,
        expiryDate: new Date(Date.now() + 86400000).toISOString(),
      });
    expect([400, 409]).toContain(dupRes.status);
    expect(dupRes.body.message).toMatch(/already exists/i);
  });

  it('blocks non-admin users from creating coupons', async () => {
    const res = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        code: 'HACKERCOUPON',
        discountType: 'percentage',
        discountValue: 99,
      });

    expect(res.status).toBe(403);
  });
});
