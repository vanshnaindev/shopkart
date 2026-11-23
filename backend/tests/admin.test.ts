import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.ts';
import { db } from '../src/db.ts';

describe('Admin Authorization & Operations', () => {
  let adminToken: string;
  let customerToken: string;
  let adminUser: any;

  it('authenticates admin and customer users', async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@shopkart.com', password: 'AdminPassword123!' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.token;
    adminUser = adminRes.body.user;

    const custRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@shopkart.com', password: 'Customer123!' });
    expect(custRes.status).toBe(200);
    customerToken = custRes.body.token;
  });

  it('protects admin endpoints with 401 (unauthenticated) and 403 (forbidden for customers)', async () => {
    // Unauthenticated
    const noAuthRes = await request(app).get('/api/admin/dashboard');
    expect(noAuthRes.status).toBe(401);

    // Forbidden for customer
    const forbiddenRes = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(forbiddenRes.status).toBe(403);

    // Allowed for admin
    const allowedRes = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body.analytics).toBeDefined();
    expect(allowedRes.body.analytics.totalRevenue).toBeGreaterThanOrEqual(0);
  });

  it('blocks category deletion when category has products associated with it', async () => {
    const categories = await db.categories.find();
    expect(categories.length).toBeGreaterThan(0);
    const cat = categories[0];

    const delRes = await request(app)
      .delete(`/api/categories/${cat._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Since products exist in this category, deletion must be blocked
    expect(delRes.status).toBe(400);
    expect(delRes.body.message).toMatch(/product/i);
  });

  it('blocks customer account and prevents subsequent logins or token usage', async () => {
    // Create new customer to block
    const blockEmail = `toblocked_${Date.now()}@test.com`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'To Block', email: blockEmail, password: 'Password123!' });
    const blockedUserId = regRes.body.user._id;
    const initialToken = regRes.body.token;

    // Admin blocks the user
    const blockRes = await request(app)
      .patch(`/api/admin/users/${blockedUserId}/block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isBlocked: true });
    expect(blockRes.status).toBe(200);
    expect(blockRes.body.user.isBlocked).toBe(true);

    // Blocked user's existing token must now be rejected (403)
    const accessRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${initialToken}`);
    expect(accessRes.status).toBe(403);

    // Blocked user cannot log in (403)
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: blockEmail, password: 'Password123!' });
    expect(loginRes.status).toBe(403);
  });

  it('prevents admins from blocking themselves', async () => {
    const selfBlockRes = await request(app)
      .patch(`/api/admin/users/${adminUser._id}/block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isBlocked: true });

    expect(selfBlockRes.status).toBe(400);
    expect(selfBlockRes.body.message).toMatch(/themselves/i);
  });
});
