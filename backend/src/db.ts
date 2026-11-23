import mongoose from 'mongoose';
import { IRepository } from './repository/types.ts';
import { JsonRepository } from './repository/JsonRepository.ts';
import { MongoRepository } from './repository/MongoRepository.ts';

let activeRepo: IRepository = new JsonRepository();
let mongoConnected = false;

export function getStorageMode(): 'json' | 'mongodb' {
  return activeRepo.mode;
}

export async function connectMongoDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri || !uri.trim()) {
    console.log(
      'ℹ️ MONGODB_URI not provided; running high-performance embedded persistent JSON store (mode: json).'
    );
    return;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    mongoConnected = true;
    activeRepo = new MongoRepository();
    console.log(
      '🚀 Connected to MongoDB successfully. Running with Mongoose repository (mode: mongodb).'
    );
  } catch (err) {
    mongoConnected = false;
    activeRepo = new JsonRepository();
    console.warn(
      '⚠️ MongoDB connection failed, falling back to embedded persistent storage (mode: json):',
      err
    );
  }
}

export async function resetDatabase(): Promise<void> {
  return activeRepo.resetDatabase();
}

// Database Access Object (DAO) delegating to the active repository
export const db: IRepository = {
  get mode() {
    return activeRepo.mode;
  },
  get users() {
    return activeRepo.users;
  },
  get products() {
    return activeRepo.products;
  },
  get categories() {
    return activeRepo.categories;
  },
  get carts() {
    return activeRepo.carts;
  },
  get wishlists() {
    return activeRepo.wishlists;
  },
  get orders() {
    return activeRepo.orders;
  },
  get coupons() {
    return activeRepo.coupons;
  },
  get reviews() {
    return activeRepo.reviews;
  },
  get inventoryLogs() {
    return activeRepo.inventoryLogs;
  },
  getAnalytics: () => activeRepo.getAnalytics(),
  resetDatabase: () => activeRepo.resetDatabase(),
};
