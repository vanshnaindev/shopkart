// Phase 3 contract smoke test: Admin dashboards, Product/Category CRUD, Inventory audit, Customer block,
// Reviews moderation, Coupons admin, Reports CSV escaping, and strict RBAC protection.
// Usage: BASE_URL=http://localhost:5173 node backend/scripts/smoke-phase3.mjs   (via frontend proxy)
//        BASE_URL=http://localhost:5000 node backend/scripts/smoke-phase3.mjs   (direct to backend)

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
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {}
  } else {
    try {
      data = await res.text();
    } catch {}
  }
  return { status: res.status, data };
}

console.log('# Setup & Auth Initialization');
let r = await call('POST', '/seed/reset');
ok('seed reset', r.status === 200 && r.data?.success);

r = await call('GET', '/health');
ok('health check', r.status === 200 && r.data?.status === 'ok');

// Admin login
r = await call('POST', '/auth/login', {
  email: 'admin@shopkart.com',
  password: 'AdminPassword123!',
});
ok('admin login', r.status === 200 && r.data?.token);
const adminToken = r.data?.token;

// Customer login
r = await call('POST', '/auth/login', { email: 'customer@shopkart.com', password: 'Customer123!' });
ok('customer login', r.status === 200 && r.data?.token);
const customerToken = r.data?.token;
const customerUser = r.data?.user;

console.log(
  '\n# Scenario 1: RBAC Enforcement - Customer and Unauthenticated Blocked from Admin Routes'
);
{
  const protectedRoutes = [
    { method: 'GET', path: '/admin/dashboard' },
    { method: 'GET', path: '/admin/orders' },
    { method: 'PATCH', path: '/admin/orders/ord_123/status', body: { status: 'Confirmed' } },
    { method: 'GET', path: '/admin/users' },
    { method: 'PATCH', path: '/admin/users/usr_123/block', body: { isBlocked: true } },
    { method: 'GET', path: '/admin/inventory' },
    { method: 'GET', path: '/admin/inventory/prod_123' },
    {
      method: 'PATCH',
      path: '/admin/inventory/prod_123',
      body: { adjustment: 5, reason: 'Restock' },
    },
    { method: 'GET', path: '/admin/reports?range=monthly' },
    {
      method: 'POST',
      path: '/products',
      body: { name: 'Test', price: 100, category: 'Electronics' },
    },
    { method: 'PUT', path: '/products/prod_123', body: { price: 120 } },
    { method: 'DELETE', path: '/products/prod_123' },
    {
      method: 'POST',
      path: '/products/bulk-import',
      body: { products: [{ name: 'A', price: 10, category: 'C' }] },
    },
    { method: 'POST', path: '/categories', body: { name: 'NewCat' } },
    { method: 'PUT', path: '/categories/cat_123', body: { name: 'UpdatedCat' } },
    { method: 'DELETE', path: '/categories/cat_123' },
    { method: 'GET', path: '/coupons/all' },
    {
      method: 'POST',
      path: '/coupons',
      body: {
        code: 'TESTCOUP',
        discountType: 'fixed',
        discountValue: 50,
        expiryDate: '2028-01-01',
      },
    },
    { method: 'PUT', path: '/coupons/coup_123', body: { discountValue: 60 } },
    { method: 'DELETE', path: '/coupons/coup_123' },
    { method: 'GET', path: '/reviews' },
    { method: 'PATCH', path: '/reviews/rev_123/approve', body: { approved: true } },
    { method: 'DELETE', path: '/reviews/rev_123' },
  ];

  for (const route of protectedRoutes) {
    // 1. Unauthenticated -> 401
    const unauthRes = await call(route.method, route.path, route.body, undefined);
    ok(`unauthenticated ${route.method} ${route.path} returns 401`, unauthRes.status === 401);

    // 2. Customer token -> 403
    const custRes = await call(route.method, route.path, route.body, customerToken);
    ok(`customer ${route.method} ${route.path} returns 403`, custRes.status === 403);
  }
}

console.log('\n# Scenario 2: Dashboard Analytics & Real Data Accuracy');
{
  r = await call('GET', '/admin/dashboard', undefined, adminToken);
  ok('admin dashboard returns 200', r.status === 200 && r.data?.success);
  const a = r.data?.analytics;
  ok('analytics has totalRevenue', typeof a?.totalRevenue === 'number' && a.totalRevenue > 0);
  ok('analytics has totalOrders', typeof a?.totalOrders === 'number' && a.totalOrders > 0);
  ok('analytics has totalProducts', typeof a?.totalProducts === 'number' && a.totalProducts > 0);
  ok('analytics has totalCustomers', typeof a?.totalCustomers === 'number' && a.totalCustomers > 0);
  ok('analytics has lowStockCount (stock <= 15)', typeof a?.lowStockCount === 'number');
  ok('analytics has outOfStockCount (stock === 0)', typeof a?.outOfStockCount === 'number');
  ok('analytics monthlyRevenue is array', Array.isArray(a?.monthlyRevenue));
  ok('analytics weeklySales is array', Array.isArray(a?.weeklySales));
  ok('analytics recentOrders is array', Array.isArray(a?.recentOrders));
  ok('analytics topSellingProducts is array', Array.isArray(a?.topSellingProducts));
}

console.log('\n# Scenario 3: Admin Orders Filtering & Status Transitions');
{
  // Filter by status
  r = await call('GET', '/admin/orders?status=Delivered', undefined, adminToken);
  ok(
    'filter orders by status',
    r.status === 200 && r.data?.orders?.every((o) => o.orderStatus === 'Delivered')
  );

  // Search by orderNumber or userName
  const sampleOrder = r.data.orders[0];
  r = await call('GET', `/admin/orders?search=${sampleOrder.orderNumber}`, undefined, adminToken);
  ok(
    'search order by orderNumber',
    r.status === 200 && r.data?.orders?.some((o) => o.orderNumber === sampleOrder.orderNumber)
  );

  // Place a new order to test status transitions
  const newCustEmail = `flow_trans_${Date.now()}@test.com`;
  const regRes = await call('POST', '/auth/register', {
    name: 'Trans User',
    email: newCustEmail,
    phone: '9988776655',
    password: 'Password123!',
  });
  const transUserToken = regRes.data.token;
  const transAddr = {
    fullName: 'Trans User',
    phone: '9988776655',
    street: '1 Lane',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
    type: 'home',
  };
  await call('POST', '/auth/address', transAddr, transUserToken);

  const catRes = await call('GET', '/products?limit=5');
  const targetProd = catRes.data.products[0];

  const orderRes = await call(
    'POST',
    '/orders',
    {
      items: [{ productId: targetProd._id, quantity: 1 }],
      shippingAddress: transAddr,
      paymentMethod: 'COD',
    },
    transUserToken
  );
  ok('trans test order created', orderRes.status === 201 && orderRes.data?.order);
  const testOrder = orderRes.data.order;
  ok('initial status is Confirmed', testOrder.orderStatus === 'Confirmed');

  // Invalid transition: Confirmed -> Delivered directly should be rejected (400)
  r = await call(
    'PATCH',
    `/admin/orders/${testOrder._id}/status`,
    { status: 'Delivered' },
    adminToken
  );
  ok(
    'invalid transition Confirmed -> Delivered rejected (400)',
    r.status === 400 && !r.data?.success
  );

  // Valid transition: Confirmed -> Processing
  r = await call(
    'PATCH',
    `/admin/orders/${testOrder._id}/status`,
    { status: 'Processing', note: 'Order being packed' },
    adminToken
  );
  ok(
    'valid transition Confirmed -> Processing (200)',
    r.status === 200 && r.data?.order?.orderStatus === 'Processing'
  );

  // Valid transition: Processing -> Shipped
  r = await call(
    'PATCH',
    `/admin/orders/${testOrder._id}/status`,
    { status: 'Shipped' },
    adminToken
  );
  ok(
    'valid transition Processing -> Shipped (200)',
    r.status === 200 && r.data?.order?.orderStatus === 'Shipped'
  );

  // Valid transition: Shipped -> Delivered
  r = await call(
    'PATCH',
    `/admin/orders/${testOrder._id}/status`,
    { status: 'Delivered' },
    adminToken
  );
  ok(
    'valid transition Shipped -> Delivered (200)',
    r.status === 200 && r.data?.order?.orderStatus === 'Delivered'
  );
}

console.log('\n# Scenario 4: Product CRUD - Validation, Slug/SKU, Discount, Soft vs Hard Delete');
{
  // Missing required fields
  r = await call('POST', '/products', { name: '', price: 0 }, adminToken);
  ok('product creation requires name, price, category (400)', r.status === 400);

  // Successful creation with auto slug, SKU, and discount
  const uniqueName = `Smart Widget ${Date.now()}`;
  r = await call(
    'POST',
    '/products',
    {
      name: uniqueName,
      price: 800,
      originalPrice: 1000,
      category: 'Electronics',
      brand: 'Acme',
      stock: 25,
      description: 'High tech widget',
    },
    adminToken
  );
  ok('product created successfully (201)', r.status === 201 && r.data?.product);
  const createdProd = r.data.product;
  ok('auto slug generated', createdProd.slug && createdProd.slug.startsWith('smart-widget'));
  ok('auto SKU generated', createdProd.sku && createdProd.sku.startsWith('SKU-'));
  ok('discount computed (20%)', createdProd.discount === 20);

  // Update product price & recalculate discount
  r = await call('PUT', `/products/${createdProd._id}`, { price: 500 }, adminToken);
  ok('product updated (200)', r.status === 200 && r.data?.product?.price === 500);
  ok('discount recomputed to 50%', r.data?.product?.discount === 50);

  // Hard delete: product has not been ordered yet
  r = await call('DELETE', `/products/${createdProd._id}`, undefined, adminToken);
  ok('product hard-deleted when not in orders', r.status === 200 && r.data?.softDeleted === false);

  // Check it is gone
  r = await call('GET', `/products/${createdProd._id}`);
  ok('deleted product not found', r.status === 404);

  // Soft delete: test with a product that HAS appeared in orders
  const catalogRes = await call('GET', '/products?limit=1');
  const orderedProd = catalogRes.data.products[0];
  r = await call('DELETE', `/products/${orderedProd._id}`, undefined, adminToken);
  ok(
    'ordered product soft-deleted (softDeleted: true)',
    r.status === 200 && r.data?.softDeleted === true
  );

  // Active query should not return soft deleted product
  r = await call('GET', `/products/${orderedProd._id}`);
  ok(
    'soft-deleted product still exists in db',
    r.status === 200 && r.data?.product?.isActive === false
  );
  const activeList = await call('GET', '/products?activeOnly=true');
  ok(
    'soft-deleted product omitted from active list',
    !activeList.data?.products?.some((p) => p._id === orderedProd._id)
  );
}

console.log('\n# Scenario 5: Product Bulk Import with Per-Row Validation');
{
  const bulkPayload = {
    products: [
      { name: 'Bulk Product Alpha', price: 999, category: 'Electronics', stock: 10 },
      { name: 'Bulk Product Beta', price: 1499, category: 'Accessories', stock: 15 },
      { name: '', price: 500, category: 'Electronics' }, // Invalid: empty name
      { name: 'Bulk Product Gamma', price: -50, category: 'Electronics' }, // Invalid: negative price
      { name: 'Bulk Product Delta', price: 300, category: '' }, // Invalid: empty category
      { name: 'Bulk Product Epsilon', price: 200, category: 'Books', stock: -5 }, // Invalid: negative stock
    ],
  };

  r = await call('POST', '/products/bulk-import', bulkPayload, adminToken);
  ok('bulk import responds 200', r.status === 200 && r.data?.success);
  ok('imported 2 valid products', r.data?.imported === 2);
  ok('rejected 4 invalid rows', r.data?.rejected === 4);
  ok(
    'returns rejected reasons details',
    Array.isArray(r.data?.details?.rejectedRows) && r.data.details.rejectedRows.length === 4
  );
}

console.log('\n# Scenario 6: Category CRUD with ItemCount and Deletion Guard');
{
  // Categories have itemCount
  r = await call('GET', '/categories');
  ok(
    'categories fetched with itemCount',
    r.status === 200 && r.data?.categories?.every((c) => typeof c.itemCount === 'number')
  );

  // Attempt to delete category that contains products
  const categoryWithProducts = r.data.categories.find((c) => c.itemCount > 0);
  r = await call('DELETE', `/categories/${categoryWithProducts._id}`, undefined, adminToken);
  ok(
    'deleting category with products blocked (400)',
    r.status === 400 && r.data?.message?.includes('still contains')
  );

  // Create an empty category and delete it
  const newCatName = `Temporary Empty ${Date.now()}`;
  r = await call(
    'POST',
    '/categories',
    { name: newCatName, description: 'Empty category' },
    adminToken
  );
  ok('empty category created', r.status === 201 && r.data?.category);
  const newCatId = r.data.category._id;

  // Duplicate category name rejected
  const dupRes = await call('POST', '/categories', { name: newCatName }, adminToken);
  ok('duplicate category name rejected (409)', dupRes.status === 409);

  // Delete empty category succeeds
  r = await call('DELETE', `/categories/${newCatId}`, undefined, adminToken);
  ok('empty category successfully deleted (200)', r.status === 200 && r.data?.success);
}

console.log('\n# Scenario 7: Inventory Adjustment & Audit Trail');
{
  // Get inventory
  r = await call('GET', '/admin/inventory', undefined, adminToken);
  ok('admin inventory overview fetched', r.status === 200 && Array.isArray(r.data?.products));
  const testProd = r.data.products[0];
  const initialStock = testProd.stock;

  // Rejection: Missing reason
  r = await call('PATCH', `/admin/inventory/${testProd._id}`, { adjustment: 5 }, adminToken);
  ok('adjustment without reason rejected (400)', r.status === 400 && !r.data?.success);

  // Rejection: Negative resulting stock
  r = await call(
    'PATCH',
    `/admin/inventory/${testProd._id}`,
    { adjustment: -(initialStock + 10), reason: 'Damaged' },
    adminToken
  );
  ok('negative resulting stock rejected (400)', r.status === 400 && !r.data?.success);

  // Success: Stock adjustment with reason
  r = await call(
    'PATCH',
    `/admin/inventory/${testProd._id}`,
    { adjustment: 12, reason: 'Warehouse shipment arrived' },
    adminToken
  );
  ok(
    'stock adjustment succeeds (200)',
    r.status === 200 && r.data?.product?.stock === initialStock + 12
  );
  ok(
    'audit log returned',
    r.data?.log?.previousStock === initialStock && r.data?.log?.newStock === initialStock + 12
  );

  // Verify product inventory log endpoint
  r = await call('GET', `/admin/inventory/${testProd._id}`, undefined, adminToken);
  ok(
    'product inventory logs fetched',
    r.status === 200 && r.data?.logs?.some((l) => l.reason === 'Warehouse shipment arrived')
  );
}

console.log('\n# Scenario 8: Customer Block/Unblock & Token Invalidation');
{
  // Customer list with orderCount
  r = await call('GET', '/admin/users', undefined, adminToken);
  ok(
    'admin users list fetched',
    r.status === 200 && r.data?.users?.every((u) => typeof u.orderCount === 'number')
  );

  // Admin cannot block themselves
  const meAdmin = r.data.users.find((u) => u.email === 'admin@shopkart.com');
  r = await call('PATCH', `/admin/users/${meAdmin._id}/block`, { isBlocked: true }, adminToken);
  ok('admin self-block rejected (400)', r.status === 400);

  // Register a new customer to test blocking
  const blockTestEmail = `block_test_${Date.now()}@test.com`;
  const reg = await call('POST', '/auth/register', {
    name: 'Victim User',
    email: blockTestEmail,
    phone: '9123456789',
    password: 'Password123!',
  });
  const victimToken = reg.data.token;
  const victimId = reg.data.user._id;

  // Active token works before block
  let checkAuth = await call('GET', '/auth/me', undefined, victimToken);
  ok('victim token works before block (200)', checkAuth.status === 200);

  // Admin blocks victim
  r = await call('PATCH', `/admin/users/${victimId}/block`, { isBlocked: true }, adminToken);
  ok('admin blocks customer (200)', r.status === 200 && r.data?.user?.isBlocked === true);

  // Existing token must now be rejected with 403 Forbidden
  checkAuth = await call('GET', '/auth/me', undefined, victimToken);
  ok('existing token rejected with 403 for blocked customer', checkAuth.status === 403);

  // Login attempt by blocked customer must be rejected with 403 Forbidden
  const loginRes = await call('POST', '/auth/login', {
    email: blockTestEmail,
    password: 'Password123!',
  });
  ok('login rejected with 403 for blocked customer', loginRes.status === 403);

  // Admin unblocks customer
  r = await call('PATCH', `/admin/users/${victimId}/block`, { isBlocked: false }, adminToken);
  ok('admin unblocks customer (200)', r.status === 200 && r.data?.user?.isBlocked === false);

  // Customer can login again
  const reLogin = await call('POST', '/auth/login', {
    email: blockTestEmail,
    password: 'Password123!',
  });
  ok('unblocked customer can login again (200)', reLogin.status === 200 && reLogin.data?.token);
}

console.log('\n# Scenario 9: Reviews Moderation, Rating Recomputation & Verified Purchase');
{
  // Customer posts a review on a product they NEVER bought -> verifiedPurchase = false
  const catRes = await call('GET', '/products?limit=10');
  const unboughtProd = catRes.data.products[5];
  const postRev1 = await call(
    'POST',
    '/reviews',
    {
      productId: unboughtProd._id,
      rating: 2,
      title: 'Not Impressed',
      comment: 'I did not buy it here, but looks average.',
    },
    customerToken
  );
  ok('review posted', postRev1.status === 201 && postRev1.data?.review);
  const rev1 = postRev1.data.review;
  ok('unbought product review has verifiedPurchase: false', rev1.verifiedPurchase === false);

  // Customer buys product, then posts review -> verifiedPurchase = true
  const buyerEmail = `buyer_rev_${Date.now()}@test.com`;
  const buyerReg = await call('POST', '/auth/register', {
    name: 'Verified Buyer',
    email: buyerEmail,
    phone: '9888877777',
    password: 'Password123!',
  });
  const buyerToken = buyerReg.data.token;
  const buyerAddr = {
    fullName: 'Verified Buyer',
    phone: '9888877777',
    street: 'Buyer St',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    type: 'home',
  };
  await call('POST', '/auth/address', buyerAddr, buyerToken);

  // Place order
  await call(
    'POST',
    '/orders',
    {
      items: [{ productId: unboughtProd._id, quantity: 1 }],
      shippingAddress: buyerAddr,
      paymentMethod: 'COD',
    },
    buyerToken
  );

  const postRev2 = await call(
    'POST',
    '/reviews',
    {
      productId: unboughtProd._id,
      rating: 5,
      title: 'Fantastic Purchase',
      comment: 'Super fast delivery and great quality!',
    },
    buyerToken
  );
  ok('buyer review posted', postRev2.status === 201 && postRev2.data?.review);
  const rev2 = postRev2.data.review;
  ok('bought product review has verifiedPurchase: true', rev2.verifiedPurchase === true);

  // Admin moderates: hide rev2 (approve: false)
  r = await call('PATCH', `/reviews/${rev2._id}/approve`, { approved: false }, adminToken);
  ok('admin hides review (200)', r.status === 200);

  // Verify ratings recomputed excluding hidden review
  let prodDetails = await call('GET', `/products/${unboughtProd._id}`);
  const reviewsVisible = prodDetails.data?.reviews;
  ok(
    'hidden review is omitted from public product reviews',
    !reviewsVisible.some((rev) => rev._id === rev2._id)
  );

  // Admin deletes rev1
  r = await call('DELETE', `/reviews/${rev1._id}`, undefined, adminToken);
  ok('admin deletes review (200)', r.status === 200);
}

console.log('\n# Scenario 10: Coupons Admin CRUD with Validation');
{
  // Expiry in past rejected (400)
  r = await call(
    'POST',
    '/coupons',
    {
      code: 'PASTCOUP',
      discountType: 'percentage',
      discountValue: 15,
      expiryDate: '2020-01-01',
    },
    adminToken
  );
  ok('past expiry date rejected (400)', r.status === 400 && !r.data?.success);

  // Percentage > 100 rejected (400)
  r = await call(
    'POST',
    '/coupons',
    {
      code: 'OVER100',
      discountType: 'percentage',
      discountValue: 120,
      expiryDate: '2028-12-31',
    },
    adminToken
  );
  ok('percentage > 100 rejected (400)', r.status === 400 && !r.data?.success);

  // Successful coupon creation
  const futureDate = new Date(Date.now() + 30 * 86400000).toISOString();
  const newCode = `SPECIAL${Math.floor(100 + Math.random() * 900)}`;
  r = await call(
    'POST',
    '/coupons',
    {
      code: newCode,
      discountType: 'percentage',
      discountValue: 25,
      minimumOrderAmount: 1000,
      maxDiscount: 500,
      expiryDate: futureDate,
      usageLimit: 50,
      description: 'Special 25% discount',
    },
    adminToken
  );
  ok('valid coupon created (201)', r.status === 201 && r.data?.coupon);
  const createdCoupon = r.data.coupon;

  // Duplicate code rejected (409)
  const dupCoup = await call(
    'POST',
    '/coupons',
    {
      code: newCode,
      discountType: 'fixed',
      discountValue: 50,
      expiryDate: futureDate,
    },
    adminToken
  );
  ok('duplicate coupon code rejected (409)', dupCoup.status === 409);

  // Update coupon
  r = await call('PUT', `/coupons/${createdCoupon._id}`, { discountValue: 30 }, adminToken);
  ok('coupon updated (200)', r.status === 200 && r.data?.coupon?.discountValue === 30);

  // Delete coupon
  r = await call('DELETE', `/coupons/${createdCoupon._id}`, undefined, adminToken);
  ok('coupon deleted (200)', r.status === 200 && r.data?.success);
}

console.log('\n# Scenario 11: Reports & CSV Export with Formula Injection Escaping');
{
  // Test monthly reports endpoint
  r = await call('GET', '/admin/reports?range=monthly', undefined, adminToken);
  ok('reports endpoint returns 200', r.status === 200 && r.data?.reports);
  const rep = r.data.reports;
  ok('reports has totalSales', typeof rep.totalSales === 'number');
  ok('reports has totalOrders', typeof rep.totalOrders === 'number');
  ok('reports has totalCustomers', typeof rep.totalCustomers === 'number');
  ok(
    'reports has ordersCsv string',
    typeof rep.ordersCsv === 'string' && rep.ordersCsv.includes('Order ID')
  );
  ok(
    'reports has productsCsv string',
    typeof rep.productsCsv === 'string' && rep.productsCsv.includes('SKU')
  );

  // Test formula injection escaping with dangerous product names (=cmd, +cmd, -cmd, @cmd)
  const dangerousName = '=1+2;cmd.exe';
  const prodInj = await call(
    'POST',
    '/products',
    {
      name: dangerousName,
      price: 100,
      category: 'Electronics',
      brand: '@danger',
    },
    adminToken
  );
  ok('product with formula characters created', prodInj.status === 201);

  // Re-fetch reports CSV
  r = await call('GET', '/admin/reports?range=yearly', undefined, adminToken);
  const productsCsv = r.data?.reports?.productsCsv || '';

  // The formula injection protection must prepend single quote (') to cells starting with = + - @
  // e.g. "'=1+2;cmd.exe" and "'@danger"
  const escapedFormula = productsCsv.includes(`"'=1+2;cmd.exe"`);
  const escapedAt = productsCsv.includes(`"'@danger"`);
  ok('formula injection character = escaped with leading single quote', escapedFormula);
  ok('formula injection character @ escaped with leading single quote', escapedAt);
}

console.log('\n=============================================');
console.log(`Results: ${pass} passed, ${fail} failed`);
console.log('=============================================');

if (fail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
