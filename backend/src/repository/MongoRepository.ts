import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { escapeRegex } from '../utils/security.ts';
import {
  UserModel,
  ProductModel,
  CategoryModel,
  CartModel,
  WishlistModel,
  OrderModel,
  CouponModel,
  ReviewModel,
  InventoryLogModel,
} from '../models/index.ts';
import {
  IUser,
  IProduct,
  ICategory,
  ICart,
  IOrder,
  ICoupon,
  IReview,
  IInventoryLog,
} from '../types.ts';
import {
  SEED_USERS,
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_COUPONS,
  SEED_ORDERS,
  SEED_REVIEWS,
} from '../seedData.ts';
import { IRepository, IProductFilter, IOrderFilter } from './types.ts';

// Helper to sanitize document output: ensure _id is string and remove internal Mongoose __v
function sanitizeDoc<T>(doc: any): T {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map((d) => sanitizeDoc(d)) as any;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id !== undefined) {
    obj._id = String(obj._id);
  }
  delete obj.__v;
  return obj as T;
}

// Transaction execution helper with automatic standalone fallback
async function withTransaction<T>(
  fn: (session: mongoose.ClientSession | null) => Promise<T>
): Promise<T> {
  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (err) {
    session = null;
  }

  if (!session) {
    return fn(null);
  }

  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    if (error?.message && error.message.includes('replica set')) {
      return fn(null);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export class MongoRepository implements IRepository {
  readonly mode = 'mongodb' as const;

  async resetDatabase(): Promise<void> {
    // Clear all collections
    await Promise.all([
      UserModel.deleteMany({}),
      ProductModel.deleteMany({}),
      CategoryModel.deleteMany({}),
      CartModel.deleteMany({}),
      WishlistModel.deleteMany({}),
      OrderModel.deleteMany({}),
      CouponModel.deleteMany({}),
      ReviewModel.deleteMany({}),
      InventoryLogModel.deleteMany({}),
    ]);

    // Ensure all passwords in SEED_USERS are bcrypt hashes
    const seededUsers = SEED_USERS.map((u) => {
      let pwd = u.password || 'Customer123!';
      if (!pwd.startsWith('$2')) {
        pwd = bcrypt.hashSync(pwd, 10);
      }
      return { ...u, password: pwd };
    });

    // Insert seeds
    await Promise.all([
      UserModel.insertMany(seededUsers as any),
      ProductModel.insertMany(SEED_PRODUCTS as any),
      CategoryModel.insertMany(SEED_CATEGORIES as any),
      OrderModel.insertMany(SEED_ORDERS as any),
      CouponModel.insertMany(SEED_COUPONS as any),
      ReviewModel.insertMany(SEED_REVIEWS as any),
      WishlistModel.create({
        _id: 'wsh_001',
        userId: 'usr_cust_001',
        productIds: ['prod_mob_01', 'prod_elec_03'],
        updatedAt: new Date().toISOString(),
      }),
      InventoryLogModel.create({
        id: 'log_01',
        productId: 'prod_mob_01',
        productName: 'Apple iPhone 15 Pro Max',
        previousStock: 20,
        newStock: 25,
        change: 5,
        reason: 'Initial Batch Intake',
        updatedBy: 'Admin',
        timestamp: new Date().toISOString(),
      }),
    ]);

    console.log('MongoDB initialized with pristine seed data.');
  }

  users = {
    find: async (): Promise<IUser[]> => {
      const docs = await UserModel.find().sort({ createdAt: -1 }).lean();
      return docs.map(sanitizeDoc<IUser>);
    },
    findById: async (id: string): Promise<IUser | null> => {
      const doc = await UserModel.findOne({ _id: id } as any).lean();
      return doc ? sanitizeDoc<IUser>(doc) : null;
    },
    findByEmail: async (email: string): Promise<IUser | null> => {
      const norm = email.toLowerCase().trim();
      const doc = await UserModel.findOne({ email: norm } as any).lean();
      return doc ? sanitizeDoc<IUser>(doc) : null;
    },
    create: async (userData: Partial<IUser>): Promise<IUser> => {
      let password = userData.password || '';
      if (password && !password.startsWith('$2')) {
        password = bcrypt.hashSync(password, 10);
      }
      const _id = userData._id || 'usr_' + Math.random().toString(36).substring(2, 9);
      const user = await UserModel.create({
        ...userData,
        _id,
        email: (userData.email || '').toLowerCase().trim(),
        password,
        role: userData.role || 'customer',
        addresses: userData.addresses || [],
        isBlocked: Boolean(userData.isBlocked),
        createdAt: userData.createdAt || new Date().toISOString(),
      } as any);
      return sanitizeDoc<IUser>(user.toObject());
    },
    update: async (id: string, updateData: Partial<IUser>): Promise<IUser | null> => {
      if (updateData.password && !updateData.password.startsWith('$2')) {
        updateData.password = bcrypt.hashSync(updateData.password, 10);
      }
      const updated = await (UserModel as any)
        .findOneAndUpdate({ _id: id }, { $set: updateData }, { returnDocument: 'after' })
        .lean();
      return updated ? sanitizeDoc<IUser>(updated) : null;
    },
    delete: async (id: string): Promise<boolean> => {
      const res = await UserModel.deleteOne({ _id: id } as any);
      return res.deletedCount > 0;
    },
  };

  products = {
    find: async (filter?: IProductFilter): Promise<IProduct[]> => {
      const query: any = {};

      if (filter?.activeOnly !== false) {
        query.isActive = { $ne: false };
      }

      if (filter?.category && filter.category !== 'All') {
        const catEscaped = escapeRegex(filter.category);
        const catClean = escapeRegex(filter.category.replace(/&/g, 'and'));
        query.$or = [
          { category: new RegExp('^' + catEscaped + '$', 'i') },
          { category: new RegExp(catEscaped, 'i') },
          { category: new RegExp(catClean, 'i') },
        ];
      }

      if (filter?.brand) {
        query.brand = new RegExp('^' + escapeRegex(filter.brand) + '$', 'i');
      }

      if (filter?.search) {
        const term = escapeRegex(filter.search.trim());
        query.$or = [
          { name: new RegExp(term, 'i') },
          { description: new RegExp(term, 'i') },
          { brand: new RegExp(term, 'i') },
          { category: new RegExp(term, 'i') },
        ];
      }

      if (filter?.minPrice !== undefined && !isNaN(filter.minPrice)) {
        query.price = { ...(query.price || {}), $gte: filter.minPrice };
      }
      if (filter?.maxPrice !== undefined && !isNaN(filter.maxPrice)) {
        query.price = { ...(query.price || {}), $lte: filter.maxPrice };
      }
      if (filter?.minRating !== undefined && !isNaN(filter.minRating)) {
        query.averageRating = { $gte: filter.minRating };
      }
      if (filter?.featured) {
        query.isFeatured = true;
      }
      if (filter?.bestSeller) {
        query.isBestSeller = true;
      }
      if (filter?.deals) {
        query.$or = [{ isDealOfDay: true }, { discount: { $gte: 20 } }];
      }

      const docs = await ProductModel.find(query).sort({ createdAt: -1 }).lean();
      return docs.map(sanitizeDoc<IProduct>);
    },
    findById: async (id: string): Promise<IProduct | null> => {
      const doc = await ProductModel.findOne({
        $or: [{ _id: id }, { slug: id }],
      } as any).lean();
      return doc ? sanitizeDoc<IProduct>(doc) : null;
    },
    create: async (data: Partial<IProduct>): Promise<IProduct> => {
      let baseSlug = (data.name || 'product')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      if (!baseSlug) baseSlug = 'product';

      let slug = data.slug || baseSlug;
      let counter = 1;
      while (await ProductModel.exists({ slug } as any)) {
        slug = `${baseSlug}-${counter++}`;
      }

      let sku = data.sku || 'SKU-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      let skuCounter = 1;
      while (await ProductModel.exists({ sku } as any)) {
        sku = `${data.sku || 'SKU'}-${skuCounter++}`;
      }

      const price = Number(data.price) || 0;
      let originalPrice = data.originalPrice !== undefined ? Number(data.originalPrice) : price;
      if (isNaN(originalPrice) || originalPrice <= 0) originalPrice = price;

      let discount = 0;
      if (originalPrice > price && originalPrice > 0) {
        discount = Math.round(((originalPrice - price) / originalPrice) * 100);
      } else {
        originalPrice = price;
        discount = 0;
      }

      const _id = data._id || 'prod_' + Math.random().toString(36).substring(2, 9);
      const newProd = await ProductModel.create({
        ...data,
        _id,
        name: (data.name || 'Untitled Product').trim(),
        slug,
        brand: data.brand || 'Generic',
        category: data.category || 'Electronics',
        price,
        originalPrice,
        discount: data.discount !== undefined ? Number(data.discount) : discount,
        stock: Math.max(0, Number(data.stock) || 0),
        sku,
        images:
          data.images && data.images.length > 0
            ? data.images
            : [
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
              ],
        specifications: data.specifications || [],
        averageRating: data.averageRating !== undefined ? Number(data.averageRating) : 0,
        numReviews: data.numReviews !== undefined ? Number(data.numReviews) : 0,
        isFeatured: Boolean(data.isFeatured),
        isBestSeller: Boolean(data.isBestSeller),
        isDealOfDay: Boolean(data.isDealOfDay),
        isActive: data.isActive !== false,
        createdAt: data.createdAt || new Date().toISOString(),
      } as any);

      return sanitizeDoc<IProduct>(newProd.toObject());
    },
    update: async (id: string, data: Partial<IProduct>): Promise<IProduct | null> => {
      const existing = await ProductModel.findOne({ _id: id } as any);
      if (!existing) return null;

      if (data.price !== undefined || data.originalPrice !== undefined) {
        const finalPrice = data.price !== undefined ? Number(data.price) : existing.price;
        let finalOrig =
          data.originalPrice !== undefined ? Number(data.originalPrice) : existing.originalPrice;
        if (finalOrig > finalPrice && finalOrig > 0) {
          data.discount = Math.round(((finalOrig - finalPrice) / finalOrig) * 100);
        } else {
          finalOrig = finalPrice;
          data.discount = 0;
        }
        data.originalPrice = finalOrig;
        data.price = finalPrice;
      }

      if (data.sku && data.sku !== existing.sku) {
        let sku = data.sku;
        let counter = 1;
        while (await ProductModel.exists({ _id: { $ne: id }, sku } as any)) {
          sku = `${data.sku}-${counter++}`;
        }
        data.sku = sku;
      }

      if (data.slug && data.slug !== existing.slug) {
        let slug = data.slug;
        let counter = 1;
        while (await ProductModel.exists({ _id: { $ne: id }, slug } as any)) {
          slug = `${data.slug}-${counter++}`;
        }
        data.slug = slug;
      }

      const updated = await (ProductModel as any)
        .findOneAndUpdate({ _id: id }, { $set: data }, { returnDocument: 'after' })
        .lean();

      return updated ? sanitizeDoc<IProduct>(updated) : null;
    },
    delete: async (id: string): Promise<boolean> => {
      const res = await ProductModel.deleteOne({ _id: id } as any);
      return res.deletedCount > 0;
    },
    recomputeRating: async (productId: string): Promise<void> => {
      const approved = await ReviewModel.find({ productId, isApproved: true } as any).lean();
      const count = approved.length;
      const avg =
        count > 0 ? Number((approved.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1)) : 0;

      await ProductModel.updateOne({ _id: productId } as any, {
        $set: { numReviews: count, averageRating: avg },
      });
    },
    adjustStock: async (
      productId: string,
      quantityChange: number,
      reason: string,
      updatedBy: string
    ): Promise<boolean> => {
      if (!reason || !reason.trim()) return false;

      const query: any = { _id: productId };
      if (quantityChange < 0) {
        query.stock = { $gte: Math.abs(quantityChange) };
      }

      const prevProd = await ProductModel.findOne({ _id: productId } as any).lean();
      if (!prevProd) return false;

      const previousStock = prevProd.stock;
      if (previousStock + quantityChange < 0) return false;

      const updated: any = await (ProductModel as any)
        .findOneAndUpdate(query, { $inc: { stock: quantityChange } }, { returnDocument: 'after' })
        .lean();

      if (!updated) return false;

      await InventoryLogModel.create({
        id: 'log_' + Math.random().toString(36).substring(2, 9),
        productId,
        productName: updated.name,
        previousStock,
        newStock: updated.stock,
        change: quantityChange,
        reason: reason.trim(),
        updatedBy: updatedBy || 'Admin',
        timestamp: new Date().toISOString(),
      });

      return true;
    },
  };

  categories = {
    find: async (onlyActive: boolean = true): Promise<ICategory[]> => {
      const query: any = {};
      if (onlyActive) query.isActive = { $ne: false };
      const cats = await CategoryModel.find(query).lean();

      const counts = await Promise.all(
        cats.map((c) =>
          ProductModel.countDocuments({
            category: new RegExp('^' + escapeRegex(c.name) + '$', 'i'),
          } as any)
        )
      );

      return cats.map((c, i) => ({
        ...sanitizeDoc<ICategory>(c),
        itemCount: counts[i],
      }));
    },
    findById: async (id: string): Promise<ICategory | null> => {
      const doc = await CategoryModel.findOne({
        $or: [{ _id: id }, { slug: id }],
      } as any).lean();
      return doc ? sanitizeDoc<ICategory>(doc) : null;
    },
    create: async (data: Partial<ICategory>): Promise<ICategory> => {
      const slug = (data.name || 'category')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const _id = data._id || 'cat_' + Math.random().toString(36).substring(2, 8);
      const cat = await CategoryModel.create({
        ...data,
        _id,
        name: (data.name || 'New Category').trim(),
        slug: data.slug || slug,
        description: data.description || '',
        image:
          data.image ||
          'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=400&q=80',
        isActive: data.isActive !== false,
      } as any);
      return sanitizeDoc<ICategory>(cat.toObject());
    },
    update: async (id: string, data: Partial<ICategory>): Promise<ICategory | null> => {
      const updated = await (CategoryModel as any)
        .findOneAndUpdate({ _id: id }, { $set: data }, { returnDocument: 'after' })
        .lean();
      return updated ? sanitizeDoc<ICategory>(updated) : null;
    },
    delete: async (id: string): Promise<boolean> => {
      const res = await CategoryModel.deleteOne({ _id: id } as any);
      return res.deletedCount > 0;
    },
  };

  carts = {
    findByUserId: async (userId: string): Promise<ICart> => {
      let cart = await CartModel.findOne({ userId } as any).lean();
      if (!cart) {
        const created = await CartModel.create({
          _id: 'cart_' + Math.random().toString(36).substring(2, 8),
          userId,
          items: [],
          updatedAt: new Date().toISOString(),
        });
        cart = created.toObject();
      }

      const productIds = (cart.items || []).map((i: any) => i.productId);
      const products = await ProductModel.find({ _id: { $in: productIds } } as any).lean();
      const prodMap = new Map(products.map((p) => [String(p._id), sanitizeDoc<IProduct>(p)]));

      const populatedItems = (cart.items || [])
        .map((item: any) => ({
          productId: item.productId,
          product: prodMap.get(item.productId),
          quantity: item.quantity,
          selectedColor: item.selectedColor,
          selectedSize: item.selectedSize,
        }))
        .filter((item: any) => item.product !== undefined);

      return {
        _id: String(cart._id),
        userId: cart.userId,
        items: populatedItems,
        updatedAt: cart.updatedAt,
      };
    },
    addItem: async (userId: string, productId: string, quantity: number = 1): Promise<ICart> => {
      const cart = await CartModel.findOne({ userId } as any);
      if (!cart) {
        await CartModel.create({
          _id: 'cart_' + Math.random().toString(36).substring(2, 8),
          userId,
          items: [{ productId, quantity }],
          updatedAt: new Date().toISOString(),
        });
      } else {
        const itemIdx = cart.items.findIndex((i: any) => i.productId === productId);
        if (itemIdx > -1) {
          cart.items[itemIdx].quantity += quantity;
        } else {
          cart.items.push({ productId, quantity });
        }
        cart.updatedAt = new Date().toISOString();
        await cart.save();
      }
      return this.carts.findByUserId(userId);
    },
    updateItem: async (userId: string, productId: string, quantity: number): Promise<ICart> => {
      const cart = await CartModel.findOne({ userId } as any);
      if (cart) {
        const itemIdx = cart.items.findIndex((i: any) => i.productId === productId);
        if (itemIdx > -1) {
          if (quantity <= 0) {
            cart.items.splice(itemIdx, 1);
          } else {
            cart.items[itemIdx].quantity = quantity;
          }
          cart.updatedAt = new Date().toISOString();
          await cart.save();
        }
      }
      return this.carts.findByUserId(userId);
    },
    removeItem: async (userId: string, productId: string): Promise<ICart> => {
      await CartModel.updateOne(
        { userId } as any,
        {
          $pull: { items: { productId } },
          $set: { updatedAt: new Date().toISOString() },
        } as any
      );
      return this.carts.findByUserId(userId);
    },
    clearCart: async (userId: string): Promise<ICart> => {
      await CartModel.updateOne(
        { userId } as any,
        {
          $set: { items: [], updatedAt: new Date().toISOString() },
        } as any
      );
      return this.carts.findByUserId(userId);
    },
  };

  wishlists = {
    findByUserId: async (
      userId: string
    ): Promise<{ productIds: string[]; products: IProduct[] }> => {
      let w = await WishlistModel.findOne({ userId } as any).lean();
      if (!w) {
        const created = await WishlistModel.create({
          _id: 'wsh_' + Math.random().toString(36).substring(2, 8),
          userId,
          productIds: [],
          updatedAt: new Date().toISOString(),
        });
        w = created.toObject();
      }
      const products = await ProductModel.find({ _id: { $in: w.productIds } } as any).lean();
      return {
        productIds: w.productIds,
        products: products.map(sanitizeDoc<IProduct>),
      };
    },
    toggle: async (
      userId: string,
      productId: string
    ): Promise<{ inWishlist: boolean; productIds: string[] }> => {
      let w = await WishlistModel.findOne({ userId } as any);
      if (!w) {
        w = await WishlistModel.create({
          _id: 'wsh_' + Math.random().toString(36).substring(2, 8),
          userId,
          productIds: [],
          updatedAt: new Date().toISOString(),
        });
      }

      const idx = w.productIds.indexOf(productId);
      let inWishlist = false;
      if (idx > -1) {
        w.productIds.splice(idx, 1);
        inWishlist = false;
      } else {
        w.productIds.push(productId);
        inWishlist = true;
      }
      w.updatedAt = new Date().toISOString();
      await w.save();
      return { inWishlist, productIds: w.productIds };
    },
  };

  orders = {
    find: async (filter?: IOrderFilter): Promise<IOrder[]> => {
      const query: any = {};
      if (filter?.userId) query.userId = filter.userId;
      if (filter?.orderStatus && filter.orderStatus !== 'All')
        query.orderStatus = filter.orderStatus;
      const docs = await OrderModel.find(query).sort({ createdAt: -1 }).lean();
      return docs.map(sanitizeDoc<IOrder>);
    },
    findById: async (id: string): Promise<IOrder | null> => {
      const doc = await OrderModel.findOne({
        $or: [{ _id: id }, { orderNumber: id }],
      } as any).lean();
      return doc ? sanitizeDoc<IOrder>(doc) : null;
    },
    create: async (data: Partial<IOrder>): Promise<IOrder> => {
      return withTransaction(async (session) => {
        const orderNumber =
          'SK-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);
        const _id = data._id || 'ord_' + Math.random().toString(36).substring(2, 9);

        // Atomic inventory decrement for each line item
        for (const item of data.orderItems || []) {
          const updated: any = await (ProductModel as any).findOneAndUpdate(
            { _id: item.productId, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { returnDocument: 'after', session: session || undefined }
          );

          if (!updated) {
            throw new Error(`Insufficient stock for product ID ${item.productId}`);
          }

          // Create inventory audit log
          await InventoryLogModel.create(
            [
              {
                id: 'log_' + Math.random().toString(36).substring(2, 9),
                productId: item.productId,
                productName: item.name,
                previousStock: updated.stock + item.quantity,
                newStock: updated.stock,
                change: -item.quantity,
                reason: `Sold in order #${orderNumber}`,
                updatedBy: data.userName || 'Customer',
                timestamp: new Date().toISOString(),
              },
            ],
            { session: session || undefined }
          );
        }

        const newOrder = await OrderModel.create(
          [
            {
              ...data,
              _id,
              orderNumber,
              userId: data.userId || 'guest',
              userName: data.userName || 'Customer',
              userEmail: data.userEmail || '',
              userPhone: data.userPhone || '',
              orderItems: data.orderItems || [],
              shippingAddress: data.shippingAddress!,
              paymentMethod: data.paymentMethod || 'COD',
              paymentStatus: data.paymentStatus || 'Pending',
              paymentReference: data.paymentReference || '',
              subtotal: data.subtotal || 0,
              discount: data.discount || 0,
              couponCode: data.couponCode || '',
              shippingCharge: data.shippingCharge || 0,
              totalAmount: data.totalAmount || 0,
              orderStatus: data.orderStatus || 'Confirmed',
              statusHistory:
                data.statusHistory && data.statusHistory.length > 0
                  ? data.statusHistory
                  : [
                      {
                        status: data.orderStatus || 'Confirmed',
                        timestamp: new Date().toISOString(),
                        note: 'Order placed',
                      },
                    ],
              createdAt: data.createdAt || new Date().toISOString(),
            },
          ],
          { session: session || undefined }
        );

        return sanitizeDoc<IOrder>(newOrder[0].toObject());
      });
    },
    update: async (id: string, updateData: Partial<IOrder>): Promise<IOrder | null> => {
      const updated = await (OrderModel as any)
        .findOneAndUpdate(
          { $or: [{ _id: id }, { orderNumber: id }] },
          { $set: updateData },
          { returnDocument: 'after' }
        )
        .lean();
      return updated ? sanitizeDoc<IOrder>(updated) : null;
    },
    updateStatus: async (
      id: string,
      status: string,
      note?: string,
      updatedBy: string = 'Admin'
    ): Promise<IOrder | null> => {
      return withTransaction(async (session) => {
        const order = await OrderModel.findOne(
          { $or: [{ _id: id }, { orderNumber: id }] } as any,
          null,
          { session: session || undefined }
        );
        if (!order) return null;

        const previousStatus = order.orderStatus;
        order.orderStatus = status as any;
        if (!order.statusHistory) order.statusHistory = [];
        order.statusHistory.push({
          status: status as any,
          timestamp: new Date().toISOString(),
          note: note || `Status updated to ${status} by ${updatedBy}`,
        });

        if (status === 'Delivered' && order.paymentMethod === 'COD') {
          order.paymentStatus = 'Paid';
        }

        if (status === 'Refunded' || (status === 'Cancelled' && order.paymentStatus === 'Paid')) {
          order.paymentStatus = 'Refunded';
        }

        if (
          (status === 'Cancelled' || status === 'Returned') &&
          previousStatus !== 'Cancelled' &&
          previousStatus !== 'Returned'
        ) {
          for (const item of order.orderItems) {
            const updated: any = await (ProductModel as any).findOneAndUpdate(
              { _id: item.productId },
              { $inc: { stock: item.quantity } },
              { returnDocument: 'after', session: session || undefined }
            );

            if (updated) {
              await InventoryLogModel.create(
                [
                  {
                    id: 'log_' + Math.random().toString(36).substring(2, 9),
                    productId: item.productId,
                    productName: item.name,
                    previousStock: updated.stock - item.quantity,
                    newStock: updated.stock,
                    change: item.quantity,
                    reason: `Restocked from ${status.toLowerCase()} order #${order.orderNumber}`,
                    updatedBy,
                    timestamp: new Date().toISOString(),
                  },
                ],
                { session: session || undefined }
              );
            }
          }
        }

        if (status === 'Cancelled' && order.paymentStatus === 'Paid') {
          order.paymentStatus = 'Refunded';
        }

        await order.save({ session: session || undefined });
        return sanitizeDoc<IOrder>(order.toObject());
      });
    },
    cancel: async (
      id: string,
      reason?: string,
      cancelledBy: string = 'Customer'
    ): Promise<IOrder | null> => {
      return this.orders.updateStatus(
        id,
        'Cancelled',
        reason ? `Cancelled: ${reason}` : 'Cancelled by customer',
        cancelledBy
      );
    },
  };

  coupons = {
    find: async (onlyActive: boolean = true): Promise<ICoupon[]> => {
      const query: any = {};
      if (onlyActive) query.isActive = true;
      const docs = await CouponModel.find(query).sort({ createdAt: -1 }).lean();
      return docs.map(sanitizeDoc<ICoupon>);
    },
    findById: async (id: string): Promise<ICoupon | null> => {
      const doc = await CouponModel.findOne({
        $or: [{ _id: id }, { code: id.toUpperCase().trim() }],
      } as any).lean();
      return doc ? sanitizeDoc<ICoupon>(doc) : null;
    },
    findByCode: async (code: string): Promise<ICoupon | null> => {
      const norm = code.toUpperCase().trim();
      const doc = await CouponModel.findOne({ code: norm } as any).lean();
      return doc ? sanitizeDoc<ICoupon>(doc) : null;
    },
    create: async (data: Partial<ICoupon>): Promise<ICoupon> => {
      const _id = data._id || 'coup_' + Math.random().toString(36).substring(2, 8);
      const coupon = await CouponModel.create({
        ...data,
        _id,
        code: (data.code || 'COUPON').toUpperCase().trim(),
        discountType: data.discountType || 'percentage',
        discountValue: Number(data.discountValue) || 10,
        minimumOrderAmount: Number(data.minimumOrderAmount) || 0,
        maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : undefined,
        expiryDate: data.expiryDate || new Date(Date.now() + 90 * 86400000).toISOString(),
        usageLimit: Number(data.usageLimit) || 1000,
        usedCount: 0,
        isActive: data.isActive !== false,
        description: data.description || '',
      } as any);
      return sanitizeDoc<ICoupon>(coupon.toObject());
    },
    update: async (id: string, data: Partial<ICoupon>): Promise<ICoupon | null> => {
      if (data.code) data.code = data.code.toUpperCase().trim();
      const updated = await (CouponModel as any)
        .findOneAndUpdate({ _id: id }, { $set: data }, { returnDocument: 'after' })
        .lean();
      return updated ? sanitizeDoc<ICoupon>(updated) : null;
    },
    delete: async (id: string): Promise<boolean> => {
      const res = await CouponModel.deleteOne({ _id: id } as any);
      return res.deletedCount > 0;
    },
    incrementUsage: async (code: string): Promise<void> => {
      await CouponModel.updateOne({ code: code.toUpperCase().trim() } as any, {
        $inc: { usedCount: 1 },
      });
    },
  };

  reviews = {
    find: async (): Promise<IReview[]> => {
      const docs = await ReviewModel.find().sort({ createdAt: -1 }).lean();
      return docs.map(sanitizeDoc<IReview>);
    },
    findByProductId: async (
      productId: string,
      onlyApproved: boolean = true
    ): Promise<IReview[]> => {
      const query: any = { productId };
      if (onlyApproved) query.isApproved = true;
      const docs = await ReviewModel.find(query).sort({ createdAt: -1 }).lean();
      return docs.map(sanitizeDoc<IReview>);
    },
    create: async (data: Partial<IReview>): Promise<IReview> => {
      const hasBought = await OrderModel.exists({
        userId: data.userId,
        orderStatus: { $nin: ['Cancelled', 'Refunded'] },
        'orderItems.productId': data.productId,
      } as any);

      const _id = data._id || 'rev_' + Math.random().toString(36).substring(2, 8);
      const rev = await ReviewModel.create({
        ...data,
        _id,
        productId: data.productId!,
        userId: data.userId || 'anon',
        userName: data.userName || 'Shopper',
        rating: Number(data.rating) || 5,
        title: data.title || '',
        comment: data.comment || '',
        isApproved: data.isApproved !== undefined ? Boolean(data.isApproved) : true,
        verifiedPurchase: Boolean(hasBought),
        createdAt: data.createdAt || new Date().toISOString(),
      } as any);

      await this.products.recomputeRating(data.productId!);
      return sanitizeDoc<IReview>(rev.toObject());
    },
    approve: async (id: string, approved: boolean): Promise<boolean> => {
      const rev: any = await (ReviewModel as any)
        .findOneAndUpdate(
          { _id: id },
          { $set: { isApproved: approved } },
          { returnDocument: 'after' }
        )
        .lean();
      if (!rev) return false;
      await this.products.recomputeRating(rev.productId);
      return true;
    },
    delete: async (id: string): Promise<boolean> => {
      const rev: any = await ReviewModel.findOneAndDelete({ _id: id } as any).lean();
      if (!rev) return false;
      await this.products.recomputeRating(rev.productId);
      return true;
    },
  };

  inventoryLogs = {
    find: async (): Promise<IInventoryLog[]> => {
      const docs = await InventoryLogModel.find().sort({ timestamp: -1 }).lean();
      return docs.map(sanitizeDoc<IInventoryLog>);
    },
  };

  async getAnalytics(): Promise<any> {
    const validOrders = await OrderModel.find({
      orderStatus: { $nin: ['Cancelled', 'Refunded'] },
      paymentStatus: { $nin: ['Failed', 'Refunded'] },
    } as any).lean();

    const allOrders = await OrderModel.find().sort({ createdAt: -1 }).lean();
    const allProducts = await ProductModel.find().lean();
    const allUsers = await UserModel.find().lean();

    const totalRevenue = validOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalOrders = allOrders.length;
    const totalProducts = allProducts.length;
    const totalCustomers = allUsers.filter((u) => u.role === 'customer').length;
    const pendingOrders = allOrders.filter(
      (o) =>
        o.orderStatus === 'Pending' ||
        o.orderStatus === 'Processing' ||
        o.orderStatus === 'Confirmed'
    ).length;
    const deliveredOrders = allOrders.filter((o) => o.orderStatus === 'Delivered').length;
    const lowStockProducts = allProducts.filter((p) => p.stock > 0 && p.stock <= 15).length;
    const outOfStockProducts = allProducts.filter((p) => p.stock === 0).length;

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const currentMonthIdx = new Date().getMonth();
    const monthlySales = [];
    for (let i = 5; i >= 0; i--) {
      const mIdx = (currentMonthIdx - i + 12) % 12;
      const monthName = months[mIdx];
      const amount = validOrders.length > 0 ? (totalRevenue / 6) * (0.8 + (mIdx % 4) * 0.15) : 0;
      monthlySales.push({
        month: monthName,
        revenue: Math.round(amount),
        orders: Math.max(1, Math.round(totalOrders / 6 + (mIdx % 3))),
      });
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayDay = new Date().getDay();
    const weeklySales = [];
    for (let i = 6; i >= 0; i--) {
      const dIdx = (todayDay - i + 7) % 7;
      weeklySales.push({
        day: days[dIdx],
        sales: Math.round((totalRevenue / 25) * (0.7 + (dIdx % 3) * 0.25)),
        orders: Math.max(1, Math.round(totalOrders / 7)),
      });
    }

    const productSalesMap: { [productId: string]: { count: number; revenue: number } } = {};
    for (const order of allOrders) {
      if (
        order.orderStatus === 'Cancelled' ||
        order.orderStatus === 'Refunded' ||
        order.paymentStatus === 'Refunded'
      ) {
        continue;
      }
      for (const item of order.orderItems || []) {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { count: 0, revenue: 0 };
        }
        productSalesMap[item.productId].count += item.quantity;
        productSalesMap[item.productId].revenue += item.price * item.quantity;
      }
    }

    const topSellingProducts = Object.keys(productSalesMap)
      .map((pid) => {
        const prod = allProducts.find((p) => p._id === pid);
        return {
          product: prod ? sanitizeDoc<IProduct>(prod) : undefined,
          unitsSold: productSalesMap[pid].count,
          totalRevenue: productSalesMap[pid].revenue,
        };
      })
      .filter((item) => item.product !== undefined)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);

    if (topSellingProducts.length < 3) {
      const extra = allProducts
        .filter((p) => !topSellingProducts.some((t) => t.product?._id === p._id))
        .slice(0, 5 - topSellingProducts.length)
        .map((p, idx) => ({
          product: sanitizeDoc<IProduct>(p),
          unitsSold: 12 - idx * 2,
          totalRevenue: (12 - idx * 2) * p.price,
        }));
      topSellingProducts.push(...extra);
    }

    return {
      totalRevenue,
      totalOrders,
      totalProducts,
      totalCustomers,
      pendingOrders,
      deliveredOrders,
      lowStockProducts,
      lowStockCount: lowStockProducts,
      outOfStockProducts,
      outOfStockCount: outOfStockProducts,
      monthlySales,
      monthlyRevenue: monthlySales,
      weeklySales,
      topSellingProducts,
      recentOrders: allOrders.slice(0, 5).map(sanitizeDoc<IOrder>),
      recentCustomers: allUsers
        .filter((u) => u.role === 'customer')
        .slice(0, 5)
        .map(sanitizeDoc<IUser>),
    };
  }
}
