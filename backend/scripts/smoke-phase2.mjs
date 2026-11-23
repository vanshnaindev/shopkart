// Phase 2 contract smoke test: orders, coupons, payments, stock safety, cancel/return, RBAC.
// Usage: BASE_URL=http://localhost:5173 node backend/scripts/smoke-phase2.mjs   (via frontend proxy)
//        BASE_URL=http://localhost:5000 node backend/scripts/smoke-phase2.mjs   (direct to backend)
import crypto from 'crypto';

const BASE = (process.env.BASE_URL || 'http://localhost:5000') + '/api';
let pass = 0,
  fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) {
    pass++;
    console.log('  PASS', name);
  } else {
    fail++;
    console.log('  FAIL', name, extra);
  }
};

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

console.log('# Setup');
let r = await call('POST', '/seed/reset');
ok('seed reset', r.status === 200 && r.data?.success);

r = await call('GET', '/health');
ok('health check', r.status === 200 && r.data?.status === 'ok');

// Admin token
r = await call('POST', '/auth/login', {
  email: 'admin@shopkart.com',
  password: 'AdminPassword123!',
});
ok('admin login', r.status === 200 && r.data?.token);
const adminToken = r.data?.token;

// User 1
const email1 = `phase2_u1_${Date.now()}@test.com`;
r = await call('POST', '/auth/register', {
  name: 'User One',
  email: email1,
  phone: '9876543210',
  password: 'Password123!',
});
ok('user 1 registered', (r.status === 200 || r.status === 201) && r.data?.token);
const token1 = r.data?.token;
const user1 = r.data?.user;

const addr1 = {
  fullName: 'User One',
  phone: '9876543210',
  street: '123 Market Street',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
  type: 'home',
  isDefault: true,
};
r = await call('POST', '/auth/address', addr1, token1);
ok('user 1 address added', (r.status === 200 || r.status === 201) && r.data?.success);
const savedAddr1 = r.data?.user?.addresses?.[0] || addr1;

// User 2
const email2 = `phase2_u2_${Date.now()}@test.com`;
r = await call('POST', '/auth/register', {
  name: 'User Two',
  email: email2,
  phone: '9876543211',
  password: 'Password123!',
});
ok('user 2 registered', (r.status === 200 || r.status === 201) && r.data?.token);
const token2 = r.data?.token;

const addr2 = {
  fullName: 'User Two',
  phone: '9876543211',
  street: '456 Tech Park Road',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  type: 'home',
  isDefault: true,
};
r = await call('POST', '/auth/address', addr2, token2);
ok('user 2 address added', (r.status === 200 || r.status === 201) && r.data?.success);
const savedAddr2 = r.data?.user?.addresses?.[0] || addr2;

// Fetch catalog products
r = await call('GET', '/products?limit=20');
ok('catalog fetched', r.status === 200 && r.data?.products?.length > 0);
const products = r.data.products;
const pA = products[0]; // e.g. iPhone 15 Pro Max
const pB = products[1]; // e.g. Samsung Galaxy S24 Ultra
const pC = products[2]; // e.g. OnePlus 12

console.log('\n# Scenario 1: Price Tampering Ignored');
{
  const fakePrice = 1;
  const fakeSubtotal = 1;
  const fakeDiscount = 9999;
  const fakeShipping = 0;
  const fakeTotal = 1;

  r = await call(
    'POST',
    '/orders',
    {
      items: [
        {
          productId: pA._id,
          name: pA.name,
          quantity: 1,
          price: fakePrice,
        },
      ],
      shippingAddress: savedAddr1,
      paymentMethod: 'COD',
      subtotal: fakeSubtotal,
      discount: fakeDiscount,
      shippingCharge: fakeShipping,
      totalAmount: fakeTotal,
    },
    token1
  );

  ok('order placed', r.status === 201 && r.data?.success);
  const ord = r.data?.order;
  ok(
    'server recalculated subtotal from DB price',
    ord?.subtotal === pA.price,
    `got ${ord?.subtotal}, expected ${pA.price}`
  );
  ok(
    'orderItem snapshotted real DB price',
    ord?.orderItems?.[0]?.price === pA.price,
    `got ${ord?.orderItems?.[0]?.price}`
  );
  const expectedShipping = pA.price > 500 ? 0 : 40;
  ok('shipping calculated server-side', ord?.shippingCharge === expectedShipping);
  ok(
    'totalAmount recalculated without client tampering',
    ord?.totalAmount === pA.price + expectedShipping
  );
}

console.log('\n# Scenario 2: Successful Order with a Coupon');
{
  // Check coupon WELCOME100 initial usage
  r = await call('GET', '/coupons');
  const cBefore = r.data?.coupons?.find((c) => c.code === 'WELCOME100');
  const initialUsedCount = cBefore?.usedCount || 0;

  // Place order with WELCOME100 (minOrderAmount 500, discount 100)
  r = await call(
    'POST',
    '/orders',
    {
      items: [{ productId: pA._id, quantity: 1 }],
      shippingAddress: savedAddr1,
      paymentMethod: 'COD',
      couponCode: 'WELCOME100',
    },
    token1
  );

  ok('order with coupon placed', r.status === 201 && r.data?.success);
  const ord = r.data?.order;
  ok('coupon code attached', ord?.couponCode === 'WELCOME100');
  ok('discount calculated correctly (₹100)', ord?.discount === 100);
  const expectedTotal = pA.price - 100 + (pA.price > 500 ? 0 : 40);
  ok(
    'totalAmount reflects coupon discount',
    ord?.totalAmount === expectedTotal,
    `got ${ord?.totalAmount}, expected ${expectedTotal}`
  );

  // Verify coupon usedCount incremented
  r = await call('GET', '/coupons');
  const cAfter = r.data?.coupons?.find((c) => c.code === 'WELCOME100');
  ok(
    'coupon usedCount incremented by 1',
    cAfter?.usedCount === initialUsedCount + 1,
    `initial ${initialUsedCount}, now ${cAfter?.usedCount}`
  );
}

console.log('\n# Scenario 3: Stock Decrement & Inventory Logs');
{
  r = await call('GET', `/products/${pB._id}`);
  const stockBefore = r.data?.product?.stock;
  ok('got initial stock of pB', typeof stockBefore === 'number' && stockBefore >= 2);

  r = await call(
    'POST',
    '/orders',
    {
      items: [{ productId: pB._id, quantity: 2 }],
      shippingAddress: savedAddr1,
      paymentMethod: 'COD',
    },
    token1
  );
  ok('order placed for 2 units of pB', r.status === 201 && r.data?.success);

  r = await call('GET', `/products/${pB._id}`);
  const stockAfter = r.data?.product?.stock;
  ok(
    'stock decremented by 2',
    stockAfter === stockBefore - 2,
    `before ${stockBefore}, after ${stockAfter}`
  );

  // Check inventory logs in admin dashboard
  r = await call('GET', '/admin/dashboard', null, adminToken);
  ok('admin dashboard accessible', r.status === 200);
}

console.log('\n# Scenario 4: Over-Stock Order Rejected');
{
  r = await call('GET', `/products/${pB._id}`);
  const currentStock = r.data?.product?.stock;

  // Attempt to buy more than remaining stock
  r = await call(
    'POST',
    '/orders',
    {
      items: [{ productId: pB._id, quantity: currentStock + 100 }],
      shippingAddress: savedAddr1,
      paymentMethod: 'COD',
    },
    token1
  );
  ok('over-stock order rejected with 400', r.status === 400 && r.data?.success === false);

  // Verify stock unchanged
  r = await call('GET', `/products/${pB._id}`);
  ok('product stock unchanged after rejection', r.data?.product?.stock === currentStock);
}

console.log('\n# Scenario 5: Concurrent Orders for the Last Unit');
{
  // Update pC stock to 1 via admin
  r = await call('PUT', `/products/${pC._id}`, { stock: 1 }, adminToken);
  ok('set product pC stock to 1', r.status === 200 && r.data?.product?.stock === 1);

  // Send two simultaneous orders for the last 1 unit
  const orderBody1 = {
    items: [{ productId: pC._id, quantity: 1 }],
    shippingAddress: savedAddr1,
    paymentMethod: 'COD',
  };
  const orderBody2 = {
    items: [{ productId: pC._id, quantity: 1 }],
    shippingAddress: savedAddr2,
    paymentMethod: 'COD',
  };

  const [res1, res2] = await Promise.all([
    call('POST', '/orders', orderBody1, token1),
    call('POST', '/orders', orderBody2, token2),
  ]);

  const statuses = [res1.status, res2.status].sort();
  ok(
    'concurrent orders: exactly one 201 and one 400',
    statuses[0] === 201 && statuses[1] === 400,
    `statuses: ${res1.status}, ${res2.status}`
  );

  // Product stock should now be 0, never negative
  r = await call('GET', `/products/${pC._id}`);
  ok(
    'final stock is exactly 0',
    r.data?.product?.stock === 0,
    `stock is ${r.data?.product?.stock}`
  );
}

console.log('\n# Scenario 6: Cancel and Restock (including Refund for paid orders)');
{
  // Place an order for 2 units
  r = await call('GET', `/products/${pA._id}`);
  const stockBeforeOrder = r.data?.product?.stock;

  r = await call(
    'POST',
    '/orders',
    {
      items: [{ productId: pA._id, quantity: 2 }],
      shippingAddress: savedAddr1,
      paymentMethod: 'COD',
    },
    token1
  );
  ok('order placed for cancellation test', r.status === 201);
  const cancelOrder = r.data?.order;

  // Cancel order
  r = await call('PATCH', `/orders/${cancelOrder._id}/cancel`, { reason: 'Changed mind' }, token1);
  ok(
    'order cancelled successfully',
    r.status === 200 && r.data?.success && r.data?.order?.orderStatus === 'Cancelled'
  );

  // Verify stock restored
  r = await call('GET', `/products/${pA._id}`);
  ok(
    'stock restocked after cancellation',
    r.data?.product?.stock === stockBeforeOrder,
    `was ${stockBeforeOrder}, now ${r.data?.product?.stock}`
  );

  // Attempting to cancel again should fail
  r = await call('PATCH', `/orders/${cancelOrder._id}/cancel`, { reason: 'Again' }, token1);
  ok('cannot cancel already cancelled order', r.status === 400);

  // Test paid order cancellation sets paymentStatus to Refunded
  r = await call(
    'POST',
    '/orders',
    {
      items: [{ productId: pA._id, quantity: 1 }],
      shippingAddress: savedAddr1,
      paymentMethod: 'Razorpay',
    },
    token1
  );
  const paidTestOrder = r.data?.order;

  // Mark order paid via verify
  const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_shopkart';
  const rzpOrderId = 'order_test_' + Date.now();
  const rzpPayId = 'pay_test_' + Date.now();
  const sig = crypto.createHmac('sha256', secret).update(`${rzpOrderId}|${rzpPayId}`).digest('hex');

  await call(
    'POST',
    '/payments/verify',
    {
      orderId: paidTestOrder._id,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPayId,
      razorpay_signature: sig,
    },
    token1
  );

  // Verify it is Paid
  r = await call('GET', `/orders/${paidTestOrder._id}`, null, token1);
  ok('order is marked Paid', r.data?.order?.paymentStatus === 'Paid');

  // Cancel paid order
  r = await call(
    'PATCH',
    `/orders/${paidTestOrder._id}/cancel`,
    { reason: 'Refund requested' },
    token1
  );
  ok(
    'cancelled paid order sets paymentStatus to Refunded',
    r.status === 200 && r.data?.order?.paymentStatus === 'Refunded'
  );
}

console.log('\n# Scenario 7: Return Flow');
{
  // Place order
  r = await call(
    'POST',
    '/orders',
    {
      items: [{ productId: pB._id, quantity: 1 }],
      shippingAddress: savedAddr1,
      paymentMethod: 'COD',
    },
    token1
  );
  ok('order placed for return flow', r.status === 201);
  const returnOrder = r.data?.order;

  // Cannot return before Delivered
  r = await call('PATCH', `/orders/${returnOrder._id}/return`, { reason: 'Want return' }, token1);
  ok('return rejected before Delivered', r.status === 400);

  // Admin advances status: Confirmed -> Processing -> Shipped -> Out for Delivery -> Delivered
  r = await call(
    'PATCH',
    `/admin/orders/${returnOrder._id}/status`,
    { status: 'Processing' },
    adminToken
  );
  ok('status -> Processing', r.status === 200 && r.data?.order?.orderStatus === 'Processing');
  r = await call(
    'PATCH',
    `/admin/orders/${returnOrder._id}/status`,
    { status: 'Shipped' },
    adminToken
  );
  ok('status -> Shipped', r.status === 200 && r.data?.order?.orderStatus === 'Shipped');
  r = await call(
    'PATCH',
    `/admin/orders/${returnOrder._id}/status`,
    { status: 'Out for Delivery' },
    adminToken
  );
  ok(
    'status -> Out for Delivery',
    r.status === 200 && r.data?.order?.orderStatus === 'Out for Delivery'
  );
  r = await call(
    'PATCH',
    `/admin/orders/${returnOrder._id}/status`,
    { status: 'Delivered' },
    adminToken
  );
  ok('status -> Delivered', r.status === 200 && r.data?.order?.orderStatus === 'Delivered');
  ok('COD order marked Paid upon Delivery', r.data?.order?.paymentStatus === 'Paid');

  // Check pB stock before return restock
  r = await call('GET', `/products/${pB._id}`);
  const stockBeforeReturn = r.data?.product?.stock;

  // Customer requests return
  r = await call(
    'PATCH',
    `/orders/${returnOrder._id}/return`,
    { reason: 'Defective screen' },
    token1
  );
  ok(
    'customer initiated return request on delivered order',
    r.status === 200 && r.data?.order?.orderStatus === 'Return Requested'
  );

  // Admin approves and marks Returned
  r = await call(
    'PATCH',
    `/admin/orders/${returnOrder._id}/status`,
    { status: 'Returned' },
    adminToken
  );
  ok(
    'admin updated status to Returned',
    r.status === 200 && r.data?.order?.orderStatus === 'Returned'
  );

  // Verify stock restocked on Returned
  r = await call('GET', `/products/${pB._id}`);
  ok('stock restocked upon Returned status', r.data?.product?.stock === stockBeforeReturn + 1);

  // Admin marks Refunded
  r = await call(
    'PATCH',
    `/admin/orders/${returnOrder._id}/status`,
    { status: 'Refunded' },
    adminToken
  );
  ok(
    'admin updated status to Refunded',
    r.status === 200 && r.data?.order?.orderStatus === 'Refunded'
  );
  ok('paymentStatus is Refunded', r.data?.order?.paymentStatus === 'Refunded');
}

console.log('\n# Scenario 8: Invalid Transitions Rejected');
{
  r = await call(
    'POST',
    '/orders',
    {
      items: [{ productId: pA._id, quantity: 1 }],
      shippingAddress: savedAddr1,
      paymentMethod: 'COD',
    },
    token1
  );
  const ord = r.data?.order;

  // Invalid admin transitions:
  // 1. Confirmed -> Delivered directly
  r = await call('PATCH', `/admin/orders/${ord._id}/status`, { status: 'Delivered' }, adminToken);
  ok('admin transition Confirmed -> Delivered rejected', r.status === 400);

  // 2. Confirmed -> Returned directly
  r = await call('PATCH', `/admin/orders/${ord._id}/status`, { status: 'Returned' }, adminToken);
  ok('admin transition Confirmed -> Returned rejected', r.status === 400);

  // Advance to Shipped
  await call('PATCH', `/admin/orders/${ord._id}/status`, { status: 'Shipped' }, adminToken);

  // 3. Shipped -> Confirmed (backwards) rejected
  r = await call('PATCH', `/admin/orders/${ord._id}/status`, { status: 'Confirmed' }, adminToken);
  ok('admin transition backwards Shipped -> Confirmed rejected', r.status === 400);

  // 4. Shipped -> Cancelled rejected (cannot cancel after shipping)
  r = await call('PATCH', `/admin/orders/${ord._id}/status`, { status: 'Cancelled' }, adminToken);
  ok('admin transition Shipped -> Cancelled rejected', r.status === 400);

  // 5. Customer cannot cancel Shipped order
  r = await call('PATCH', `/orders/${ord._id}/cancel`, { reason: 'Too late' }, token1);
  ok('customer cancel on Shipped order rejected', r.status === 400);
}

console.log("\n# Scenario 9: Another User's Order Returns 403");
{
  // User 1 has an order
  r = await call(
    'POST',
    '/orders',
    {
      items: [{ productId: pA._id, quantity: 1 }],
      shippingAddress: savedAddr1,
      paymentMethod: 'COD',
    },
    token1
  );
  const u1Order = r.data?.order;
  ok('user 1 order created', r.status === 201);

  // User 2 attempts to read User 1's order -> 403
  r = await call('GET', `/orders/${u1Order._id}`, null, token2);
  ok('read another user order -> 403', r.status === 403);

  // User 2 attempts to cancel User 1's order -> 403
  r = await call('PATCH', `/orders/${u1Order._id}/cancel`, { reason: 'Malicious' }, token2);
  ok('cancel another user order -> 403', r.status === 403);

  // User 2 attempts to return User 1's order -> 403
  r = await call('PATCH', `/orders/${u1Order._id}/return`, { reason: 'Malicious' }, token2);
  ok('return another user order -> 403', r.status === 403);

  // Admin CAN read User 1's order -> 200
  r = await call('GET', `/orders/${u1Order._id}`, null, adminToken);
  ok('admin can access user order -> 200', r.status === 200 && r.data?.order?._id === u1Order._id);
}

console.log('\n# Scenario 10: Payment Signature Verification');
{
  // Place an order requiring payment
  r = await call(
    'POST',
    '/orders',
    {
      items: [{ productId: pB._id, quantity: 1 }],
      shippingAddress: savedAddr1,
      paymentMethod: 'Razorpay',
    },
    token1
  );
  ok('order placed for payment test', r.status === 201);
  const payOrder = r.data?.order;
  ok('initial paymentStatus is Pending', payOrder?.paymentStatus === 'Pending');

  // Create payment order
  r = await call(
    'POST',
    '/payments/create-order',
    {
      amount: payOrder.totalAmount,
      currency: 'INR',
    },
    token1
  );
  ok('create payment order succeeded', r.status === 200 && r.data?.orderId);
  const rzpOrderId = r.data.orderId;

  // Test Bad Signature
  r = await call(
    'POST',
    '/payments/verify',
    {
      orderId: payOrder._id,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: 'pay_tampered_001',
      razorpay_signature: 'invalid_bad_signature_string',
    },
    token1
  );
  ok('bad payment signature rejected with 400', r.status === 400 && r.data?.verified === false);

  // Verify order is still Pending
  r = await call('GET', `/orders/${payOrder._id}`, null, token1);
  ok('order remains Pending after failed verification', r.data?.order?.paymentStatus === 'Pending');

  // Test Good Signature
  const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_shopkart';
  const validPayId = 'pay_legit_' + Date.now();
  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${rzpOrderId}|${validPayId}`)
    .digest('hex');

  r = await call(
    'POST',
    '/payments/verify',
    {
      orderId: payOrder._id,
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: validPayId,
      razorpay_signature: validSignature,
    },
    token1
  );
  ok('good payment signature verified with 200', r.status === 200 && r.data?.verified === true);

  // Verify order is now Paid
  r = await call('GET', `/orders/${payOrder._id}`, null, token1);
  ok(
    'order marked Paid only after verification succeeds',
    r.data?.order?.paymentStatus === 'Paid' && r.data?.order?.paymentReference === validPayId
  );
}

console.log(`\nResult: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
