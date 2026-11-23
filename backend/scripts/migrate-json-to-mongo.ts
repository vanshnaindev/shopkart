import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import {
  UserModel,
  ProductModel,
  CategoryModel,
  OrderModel,
  CouponModel,
  ReviewModel,
  InventoryLogModel,
} from '../src/models/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoUri =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/shopkart?replicaSet=rs0&directConnection=true';
const storePath = path.resolve(__dirname, '../src/data/store.json');

async function migrate() {
  console.log('========================================================');
  console.log(' ShopKart JSON Store -> MongoDB Migration Utility');
  console.log('========================================================');
  console.log(`Reading JSON store from: ${storePath}`);
  console.log(`Target MongoDB URI:      ${mongoUri}`);

  if (!fs.existsSync(storePath)) {
    console.error(`Error: store.json not found at ${storePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(storePath, 'utf-8');
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch (e: any) {
    console.error('Error parsing store.json:', e.message);
    process.exit(1);
  }

  console.log('\nConnecting to MongoDB...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log('✓ Successfully connected to MongoDB.');

  const stats = {
    users: { inserted: 0, updated: 0 },
    categories: { inserted: 0, updated: 0 },
    products: { inserted: 0, updated: 0 },
    coupons: { inserted: 0, updated: 0 },
    orders: { inserted: 0, updated: 0 },
    reviews: { inserted: 0, updated: 0 },
    inventoryLogs: { inserted: 0, updated: 0 },
  };

  // 1. Migrate Users
  if (Array.isArray(data.users)) {
    for (const u of data.users) {
      const password =
        u.password && !u.password.startsWith('$2') ? bcrypt.hashSync(u.password, 10) : u.password;
      const res = await (UserModel as any).updateOne(
        { _id: u._id || u.id },
        {
          $set: {
            ...u,
            _id: u._id || u.id,
            email: u.email.toLowerCase().trim(),
            password,
            isBlocked: Boolean(u.isBlocked),
            addresses: u.addresses || [],
          },
        },
        { upsert: true }
      );
      if (res.upsertedCount > 0) stats.users.inserted++;
      else stats.users.updated++;
    }
  }

  // 2. Migrate Categories
  if (Array.isArray(data.categories)) {
    for (const c of data.categories) {
      const res = await (CategoryModel as any).updateOne(
        { _id: c._id || c.id },
        {
          $set: {
            ...c,
            _id: c._id || c.id,
          },
        },
        { upsert: true }
      );
      if (res.upsertedCount > 0) stats.categories.inserted++;
      else stats.categories.updated++;
    }
  }

  // 3. Migrate Products
  if (Array.isArray(data.products)) {
    for (const p of data.products) {
      const res = await (ProductModel as any).updateOne(
        { _id: p._id || p.id },
        {
          $set: {
            ...p,
            _id: p._id || p.id,
            isActive: p.isActive !== undefined ? p.isActive : true,
          },
        },
        { upsert: true }
      );
      if (res.upsertedCount > 0) stats.products.inserted++;
      else stats.products.updated++;
    }
  }

  // 4. Migrate Coupons
  if (Array.isArray(data.coupons)) {
    for (const cp of data.coupons) {
      const res = await (CouponModel as any).updateOne(
        { _id: cp._id || cp.id },
        {
          $set: {
            ...cp,
            _id: cp._id || cp.id,
            code: cp.code.toUpperCase().trim(),
          },
        },
        { upsert: true }
      );
      if (res.upsertedCount > 0) stats.coupons.inserted++;
      else stats.coupons.updated++;
    }
  }

  // 5. Migrate Orders
  if (Array.isArray(data.orders)) {
    for (const o of data.orders) {
      const res = await (OrderModel as any).updateOne(
        { _id: o._id || o.id },
        {
          $set: {
            ...o,
            _id: o._id || o.id,
          },
        },
        { upsert: true }
      );
      if (res.upsertedCount > 0) stats.orders.inserted++;
      else stats.orders.updated++;
    }
  }

  // 6. Migrate Reviews
  if (Array.isArray(data.reviews)) {
    for (const r of data.reviews) {
      const res = await (ReviewModel as any).updateOne(
        { _id: r._id || r.id },
        {
          $set: {
            ...r,
            _id: r._id || r.id,
          },
        },
        { upsert: true }
      );
      if (res.upsertedCount > 0) stats.reviews.inserted++;
      else stats.reviews.updated++;
    }
  }

  // 7. Migrate Inventory Logs
  if (Array.isArray(data.inventoryLogs)) {
    for (const l of data.inventoryLogs) {
      const logId = l.id || l._id;
      const res = await (InventoryLogModel as any).updateOne(
        { id: logId },
        {
          $set: {
            ...l,
            id: logId,
            _id: logId,
          },
        },
        { upsert: true }
      );
      if (res.upsertedCount > 0) stats.inventoryLogs.inserted++;
      else stats.inventoryLogs.updated++;
    }
  }

  console.log('\nMigration Summary:');
  console.log('--------------------------------------------------------');
  for (const [entity, count] of Object.entries(stats)) {
    console.log(`  ${entity.padEnd(16)}: ${count.inserted} inserted, ${count.updated} updated`);
  }
  console.log('--------------------------------------------------------');
  console.log('✓ Migration finished successfully.');

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
