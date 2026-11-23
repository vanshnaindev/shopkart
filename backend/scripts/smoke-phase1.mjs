// Phase 1 contract smoke test: auth, catalog, cart, wishlist.
// Usage: BASE_URL=http://localhost:5173 node scripts/smoke-phase1.mjs   (via frontend proxy)
//        BASE_URL=http://localhost:5000 node scripts/smoke-phase1.mjs   (direct to backend)
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
await call('POST', '/seed/reset');
let r = await call('GET', '/health');
ok('health', r.status === 200 && r.data.status === 'ok');

console.log('# Catalog');
r = await call('GET', '/categories');
ok(
  'categories list',
  r.data?.success && Array.isArray(r.data.categories) && r.data.categories.length > 0
);
const cat = r.data.categories[0];
ok('category has name/slug/image', cat.name && cat.slug && cat.image !== undefined);

r = await call('GET', '/products?page=1&limit=12&sort=popularity');
ok(
  'products list shape',
  r.data?.success &&
    Array.isArray(r.data.products) &&
    typeof r.data.total === 'number' &&
    typeof r.data.totalPages === 'number'
);
ok('products return brands facet', Array.isArray(r.data?.brands) && r.data.brands.length > 0);
ok('limit respected', r.data.products.length <= 12);
const p0 = r.data.products[0];
ok(
  'product has required fields',
  ['_id', 'name', 'price', 'originalPrice', 'stock', 'images', 'averageRating'].every(
    (k) => p0?.[k] !== undefined
  )
);

for (const sort of ['popularity', 'price-low-high', 'price-high-low', 'rating', 'newest']) {
  const s = await call('GET', `/products?limit=50&sort=${sort}`);
  ok(`sort=${sort}`, s.data?.success && s.data.products.length > 1);
  if (sort === 'price-low-high') {
    const prices = s.data.products.map((p) => p.price);
    ok(
      'price-low-high ascending',
      prices.every((v, i) => i === 0 || prices[i - 1] <= v)
    );
  }
  if (sort === 'price-high-low') {
    const prices = s.data.products.map((p) => p.price);
    ok(
      'price-high-low descending',
      prices.every((v, i) => i === 0 || prices[i - 1] >= v)
    );
  }
}
r = await call('GET', `/products?category=${encodeURIComponent(cat.name)}&limit=50`);
ok(
  'category filter',
  r.data.products.length > 0 && r.data.products.every((p) => p.category === cat.name),
  JSON.stringify(r.data.products.map((p) => p.category))
);
r = await call('GET', '/products?minPrice=500&maxPrice=2000&limit=50');
ok(
  'price range filter',
  r.data.products.length > 0 && r.data.products.every((p) => p.price >= 500 && p.price <= 2000)
);
r = await call('GET', '/products?minRating=4&limit=50');
ok(
  'minRating filter',
  r.data.products.every((p) => p.averageRating >= 4)
);
r = await call('GET', `/products?brand=${encodeURIComponent(p0.brand)}&limit=50`);
ok(
  'brand filter',
  r.data.products.length > 0 && r.data.products.every((p) => p.brand === p0.brand)
);
r = await call('GET', `/products?search=${encodeURIComponent(p0.name.split(' ')[0])}&limit=6`);
ok('search', r.data.products.length > 0);
r = await call('GET', '/products?deals=true');
ok(
  'deals filter (deal of day or >=20% off)',
  r.data.success &&
    r.data.products.length > 0 &&
    r.data.products.every((p) => p.isDealOfDay || p.discount >= 20)
);
r = await call('GET', '/products?bestSeller=true');
ok('bestSeller filter', r.data.success && r.data.products.every((p) => p.isBestSeller));
r = await call('GET', '/products?page=2&limit=5');
ok('pagination page 2', r.data.success && r.data.products.length > 0);
r = await call('GET', `/products/${p0._id}`);
ok('product by id', r.data?.success && r.data.product?._id === p0._id);
ok(
  'product detail includes related + reviews',
  Array.isArray(r.data?.relatedProducts) && Array.isArray(r.data?.reviews),
  Object.keys(r.data || {}).join(',')
);
r = await call('GET', '/products/does-not-exist');
ok('unknown product -> 404', r.status === 404);

console.log('# Auth');
const email = `phase1_${Date.now()}@test.com`;
r = await call('POST', '/auth/register', {
  name: 'Phase One',
  email,
  phone: '9876543210',
  password: 'Secret123!',
});
ok('register', r.data?.success && r.data.token && r.data.user?.email === email);
ok(
  'register does not leak password',
  !JSON.stringify(r.data).includes('Secret123!') && r.data.user?.password === undefined
);
const token = r.data.token;
r = await call('POST', '/auth/register', {
  name: 'Dup',
  email,
  phone: '9876543210',
  password: 'Secret123!',
});
ok('duplicate email rejected', r.status >= 400 && r.status < 500 && r.data?.success === false);
r = await call('POST', '/auth/login', { email, password: 'wrong' });
ok('wrong password -> 401', r.status === 401);
r = await call('POST', '/auth/login', { email, password: 'Secret123!' });
ok('login', r.data?.success && r.data.token);
r = await call('GET', '/auth/me', null, token);
ok('me', r.data?.success && r.data.user?.email === email);
r = await call('GET', '/auth/me');
ok('me without token -> 401', r.status === 401);
r = await call('PUT', '/auth/profile', { name: 'Phase Renamed', phone: '9000000001' }, token);
ok('update profile', r.data?.success && r.data.user?.name === 'Phase Renamed');
r = await call(
  'POST',
  '/auth/address',
  {
    fullName: 'Phase One',
    phone: '9876543210',
    street: '1 Main St',
    city: 'Patna',
    state: 'Bihar',
    pincode: '800001',
    type: 'home',
    isDefault: true,
  },
  token
);
ok(
  'add address',
  r.data?.success && r.data.user?.addresses?.length === 1 && r.data.user.addresses[0].id
);
r = await call(
  'PUT',
  '/auth/change-password',
  { currentPassword: 'Secret123!', newPassword: 'NewSecret123!' },
  token
);
ok('change password', r.data?.success, JSON.stringify(r.data));
r = await call('POST', '/auth/login', { email, password: 'NewSecret123!' });
ok('login with new password', r.data?.success);
r = await call('POST', '/auth/login', {
  email: 'admin@shopkart.com',
  password: 'AdminPassword123!',
});
ok('admin demo login', r.data?.success && r.data.user?.role === 'admin');
r = await call('POST', '/auth/login', { email: 'customer@shopkart.com', password: 'Customer123!' });
ok('customer demo login', r.data?.success && r.data.user?.role === 'customer');

console.log('# Cart');
const prods = (await call('GET', '/products?limit=5')).data.products;
const A = prods[0],
  B = prods[1];
r = await call('GET', '/cart');
ok('cart requires auth', r.status === 401);
r = await call('GET', '/cart', null, token);
ok(
  'empty cart',
  r.data?.success && Array.isArray(r.data.cart?.items) && r.data.cart.items.length === 0
);
r = await call('POST', '/cart', { productId: A._id, quantity: 2 }, token);
ok(
  'add to cart',
  r.data?.success && r.data.cart.items.length === 1 && r.data.cart.items[0].quantity === 2
);
ok(
  'cart items embed product',
  r.data.cart.items[0].product?._id === A._id && r.data.cart.items[0].product.price === A.price
);
r = await call('POST', '/cart', { productId: A._id, quantity: 1 }, token);
ok(
  'add same product merges quantity',
  r.data.cart.items.length === 1 && r.data.cart.items[0].quantity === 3
);
r = await call('POST', '/cart', { productId: B._id, quantity: 1 }, token);
ok('add second product', r.data.cart.items.length === 2);
r = await call('PUT', `/cart/${B._id}`, { quantity: 4 }, token);
ok(
  'update quantity',
  r.data?.success && r.data.cart.items.find((i) => i.productId === B._id).quantity === 4
);
r = await call('POST', '/cart', { productId: A._id, quantity: A.stock + 1000 }, token);
ok('stock guard on add', r.status === 400 && r.data?.success === false);
r = await call('PUT', `/cart/${A._id}`, { quantity: A.stock + 1000 }, token);
ok('stock guard on update', r.status === 400);
r = await call('POST', '/cart', { productId: 'nope', quantity: 1 }, token);
ok('unknown product rejected', r.status === 404 || r.status === 400);
r = await call('DELETE', `/cart/${A._id}`, null, token);
ok('remove item', r.data?.success && r.data.cart.items.length === 1);
r = await call('DELETE', '/cart', null, token);
ok('clear cart', r.data?.success);
r = await call('GET', '/cart', null, token);
ok('cart empty after clear', r.data.cart.items.length === 0);

console.log('# Wishlist');
r = await call('GET', '/wishlist');
ok('wishlist requires auth', r.status === 401);
r = await call('GET', '/wishlist', null, token);
ok(
  'wishlist shape',
  r.data?.success &&
    Array.isArray(r.data.wishlist?.productIds) &&
    Array.isArray(r.data.wishlist?.products)
);
r = await call('POST', '/wishlist/toggle', { productId: A._id }, token);
ok('toggle on', r.data?.success && r.data.inWishlist === true && r.data.productIds.includes(A._id));
r = await call('GET', '/wishlist', null, token);
ok(
  'wishlist has populated product',
  r.data.wishlist.products.some((p) => p._id === A._id)
);
r = await call('POST', '/wishlist/toggle', { productId: A._id }, token);
ok(
  'toggle off',
  r.data?.success && r.data.inWishlist === false && !r.data.productIds.includes(A._id)
);

console.log(`\nResult: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
