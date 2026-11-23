import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.ts';
import { db } from '../src/db.ts';

describe('Order Processing & Inventory Integrity', () => {
  const userEmail = `orders_test_${Date.now()}@test.com`;
  const password = 'Password123!';
  let token: string;
  let testProduct: any;

  const validAddress = {
    fullName: 'Order Tester',
    phone: '9876543210',
    street: '123 Test St',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    type: 'home',
  };

  it('sets up customer and an isolated product with known stock', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Order Tester', email: userEmail, password });
    expect(regRes.status).toBe(201);
    token = regRes.body.token;

    // Create a specific test product with stock = 5
    testProduct = await db.products.create({
      name: `Integrity Product ${Date.now()}`,
      slug: `integrity-prod-${Date.now()}`,
      price: 1000,
      originalPrice: 1500,
      stock: 5,
      sku: `INT-SKU-${Date.now()}`,
      images: ['https://example.com/img.jpg'],
      category: 'Electronics',
      brand: 'TestBrand',
      description: 'Test product for order integrity',
      isActive: true,
    });
  });

  it('recalculates order totals server-side and ignores client price tampering', async () => {
    const tamperedPayload = {
      items: [
        {
          productId: testProduct._id,
          quantity: 2,
          price: 1, // Client tries to buy Rs 1000 product for Rs 1
          name: 'Tampered Name',
        },
      ],
      shippingAddress: validAddress,
      paymentMethod: 'COD',
      itemsPrice: 2, // Tampered client subtotal
      shippingPrice: 0,
      totalAmount: 2, // Tampered client total
    };

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(tamperedPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const order = res.body.order;
    // Server must use real DB price (1000 * 2 = 2000)
    expect(order.subtotal).toBe(2000);
    expect(order.orderItems[0].price).toBe(1000);
    // Above Rs 500 shipping is free (0)
    expect(order.shippingCharge).toBe(0);
    expect(order.totalAmount).toBe(2000);

    // Stock should have decremented from 5 to 3
    const updatedProd = await db.products.findById(testProduct._id);
    expect(updatedProd!.stock).toBe(3);
  });

  it('handles concurrent race condition: only one order succeeds when stock is limited', async () => {
    // Create product with exactly 1 unit left
    const scarceProduct = await db.products.create({
      name: `Scarce Product ${Date.now()}`,
      slug: `scarce-prod-${Date.now()}`,
      price: 800,
      originalPrice: 1000,
      stock: 1,
      sku: `SCARCE-${Date.now()}`,
      images: ['https://example.com/scarce.jpg'],
      category: 'Electronics',
      brand: 'ScarceBrand',
      description: 'Only 1 unit in stock',
      isActive: true,
    });

    // Fire 2 concurrent order requests competing for the 1 unit
    const req1 = request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: scarceProduct._id, quantity: 1 }],
        shippingAddress: validAddress,
        paymentMethod: 'COD',
      });

    const req2 = request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: scarceProduct._id, quantity: 1 }],
        shippingAddress: validAddress,
        paymentMethod: 'COD',
      });

    const [res1, res2] = await Promise.all([req1, req2]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(201); // Exactly one succeeded
    expect(statuses).toContain(400); // The other was rejected due to lack of stock

    // Product stock must now be 0, never negative
    const finalProd = await db.products.findById(scarceProduct._id);
    expect(finalProd!.stock).toBe(0);
  });

  it('cancels an order before shipping, restocking inventory and refunding paid orders', async () => {
    // Create an order for 2 units
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: testProduct._id, quantity: 2 }],
        shippingAddress: validAddress,
        paymentMethod: 'Prepaid',
      });
    expect(createRes.status).toBe(201);
    const orderId = createRes.body.order._id;

    // Simulate payment completion
    await db.orders.update(orderId, { paymentStatus: 'Paid' });

    // Cancel the order
    const cancelRes = await request(app)
      .patch(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Found cheaper alternative' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.order.orderStatus).toBe('Cancelled');
    expect(cancelRes.body.order.paymentStatus).toBe('Refunded');

    // Verify stock was restored
    const restoredProd = await db.products.findById(testProduct._id);
    expect(restoredProd!.stock).toBe(3); // was decremented to 1, restored back to 3
  });

  it('rejects return request if order is not Delivered', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productId: testProduct._id, quantity: 1 }],
        shippingAddress: validAddress,
        paymentMethod: 'COD',
      });
    const orderId = createRes.body.order._id;

    // Attempt return on Placed order
    const returnRes = await request(app)
      .patch(`/api/orders/${orderId}/return`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Defective item' });

    expect(returnRes.status).toBe(400);
    expect(returnRes.body.message).toMatch(/delivered/i);
  });
});
