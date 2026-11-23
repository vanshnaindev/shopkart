import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.ts';

describe('Cart Functionality & Edge Cases', () => {
  const userEmail = `cart_test_${Date.now()}@test.com`;
  const password = 'Password123!';
  let token: string;
  let productId: string;
  let productStock: number;

  it('sets up a test user and gets a valid product', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Cart Tester', email: userEmail, password });
    expect(regRes.status).toBe(201);
    token = regRes.body.token;

    const prodRes = await request(app).get('/api/products?limit=1');
    expect(prodRes.body.products.length).toBeGreaterThan(0);
    productId = prodRes.body.products[0]._id;
    productStock = prodRes.body.products[0].stock;
  });

  it('requires authentication for cart endpoints', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
  });

  it('adds items to the cart and merges quantities correctly', async () => {
    // Initial add: 1 item
    const addRes = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 1 });
    expect(addRes.status).toBe(200);
    expect(addRes.body.cart.items.length).toBe(1);
    expect(addRes.body.cart.items[0].quantity).toBe(1);

    // Second add: 2 items (should merge to 3)
    const mergeRes = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 2 });
    expect(mergeRes.status).toBe(200);
    expect(mergeRes.body.cart.items.length).toBe(1);
    expect(mergeRes.body.cart.items[0].quantity).toBe(3);
  });

  it('rejects adding quantity exceeding available stock', async () => {
    const excessiveQty = productStock + 1000;
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: excessiveQty });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/stock/i);
  });

  it('updates item quantity and deletes item when quantity is 0', async () => {
    const updateRes = await request(app)
      .put(`/api/cart/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 2 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.cart.items[0].quantity).toBe(2);

    // Delete item
    const delRes = await request(app)
      .delete(`/api/cart/${productId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.cart.items.length).toBe(0);
  });

  it('clears entire cart successfully', async () => {
    // Add item back
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 1 });

    const clearRes = await request(app).delete('/api/cart').set('Authorization', `Bearer ${token}`);
    expect(clearRes.status).toBe(200);

    const getRes = await request(app).get('/api/cart').set('Authorization', `Bearer ${token}`);
    expect(getRes.body.cart.items.length).toBe(0);
  });
});
