import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import {
  IUser,
  IProduct,
  ICategory,
  ICart,
  IWishlist,
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DATA_FILE = path.resolve(DATA_DIR, 'store.json');

interface IDataStore {
  users: IUser[];
  products: IProduct[];
  categories: ICategory[];
  carts: ICart[];
  wishlists: IWishlist[];
  orders: IOrder[];
  coupons: ICoupon[];
  reviews: IReview[];
  inventoryLogs: IInventoryLog[];
}

export class JsonRepository implements IRepository {
  readonly mode = 'json' as const;
  private store: IDataStore = {
    users: [],
    products: [],
    categories: [],
    carts: [],
    wishlists: [],
    orders: [],
    coupons: [],
    reviews: [],
    inventoryLogs: [],
  };

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    this.loadDatabase();
  }

  private saveToDisk(): void {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write JSON store to disk:', err);
    }
  }

  private loadDatabase(): void {
    if (fs.existsSync(DATA_FILE)) {
      try {
        const content = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
          this.store = parsed;
          console.log(
            `Loaded store from disk: ${this.store.products.length} products, ${this.store.orders.length} orders.`
          );
          return;
        }
      } catch (err) {
        console.warn('Error reading store file, resetting to seed:', err);
      }
    }
    this.resetDatabaseSync();
  }

  private resetDatabaseSync(): void {
    // Ensure all seed user passwords are encrypted
    const seededUsers = SEED_USERS.map((u) => {
      let pwd = u.password || 'Customer123!';
      if (!pwd.startsWith('$2')) {
        pwd = bcrypt.hashSync(pwd, 10);
      }
      return { ...u, password: pwd };
    });

    this.store = {
      users: JSON.parse(JSON.stringify(seededUsers)),
      products: JSON.parse(JSON.stringify(SEED_PRODUCTS)),
      categories: JSON.parse(JSON.stringify(SEED_CATEGORIES)),
      carts: [],
      wishlists: [
        {
          _id: 'wsh_001',
          userId: 'usr_cust_001',
          productIds: ['prod_mob_01', 'prod_elec_03'],
          updatedAt: new Date().toISOString(),
        },
      ],
      orders: JSON.parse(JSON.stringify(SEED_ORDERS)),
      coupons: JSON.parse(JSON.stringify(SEED_COUPONS)),
      reviews: JSON.parse(JSON.stringify(SEED_REVIEWS)),
      inventoryLogs: [
        {
          id: 'log_01',
          productId: 'prod_mob_01',
          productName: 'Apple iPhone 15 Pro Max',
          previousStock: 20,
          newStock: 25,
          change: 5,
          reason: 'Initial Batch Intake',
          updatedBy: 'Admin',
          timestamp: new Date().toISOString(),
        },
      ],
    };
    this.saveToDisk();
    console.log('Database initialized with seed data.');
  }

  async resetDatabase(): Promise<void> {
    this.resetDatabaseSync();
  }

  users = {
    find: async (): Promise<IUser[]> => {
      return [...this.store.users];
    },
    findById: async (id: string): Promise<IUser | null> => {
      return this.store.users.find((u) => u._id === id) || null;
    },
    findByEmail: async (email: string): Promise<IUser | null> => {
      const norm = email.toLowerCase().trim();
      return this.store.users.find((u) => u.email.toLowerCase() === norm) || null;
    },
    create: async (userData: Partial<IUser>): Promise<IUser> => {
      let password = userData.password || '';
      if (password && !password.startsWith('$2')) {
        password = bcrypt.hashSync(password, 10);
      }
      const newUser: IUser = {
        _id: userData._id || 'usr_' + Math.random().toString(36).substring(2, 9),
        name: userData.name || '',
        email: (userData.email || '').toLowerCase().trim(),
        phone: userData.phone || '',
        password,
        role: userData.role || 'customer',
        addresses: userData.addresses || [],
        isBlocked: Boolean(userData.isBlocked),
        failedLoginAttempts: userData.failedLoginAttempts || 0,
        lockUntil: userData.lockUntil || null,
        resetPasswordToken: userData.resetPasswordToken || null,
        resetPasswordExpires: userData.resetPasswordExpires || null,
        tokenVersion: userData.tokenVersion || 0,
        createdAt: userData.createdAt || new Date().toISOString(),
      };
      this.store.users.push(newUser);
      this.saveToDisk();
      return newUser;
    },
    update: async (id: string, updateData: Partial<IUser>): Promise<IUser | null> => {
      const user = this.store.users.find((u) => u._id === id);
      if (!user) return null;
      if (updateData.password && !updateData.password.startsWith('$2')) {
        updateData.password = bcrypt.hashSync(updateData.password, 10);
      }
      Object.assign(user, updateData);
      this.saveToDisk();
      return user;
    },
    delete: async (id: string): Promise<boolean> => {
      const index = this.store.users.findIndex((u) => u._id === id);
      if (index === -1) return false;
      this.store.users.splice(index, 1);
      this.saveToDisk();
      return true;
    },
  };

  products = {
    find: async (filter?: IProductFilter): Promise<IProduct[]> => {
      let result = [...this.store.products];

      if (filter?.activeOnly !== false) {
        result = result.filter((p) => p.isActive !== false);
      }
      if (filter?.category && filter.category !== 'All') {
        const catLower = filter.category.toLowerCase().replace(/&/g, 'and');
        result = result.filter(
          (p) =>
            p.category.toLowerCase() === filter.category!.toLowerCase() ||
            p.category.toLowerCase().includes(filter.category!.toLowerCase()) ||
            catLower.includes(p.category.toLowerCase())
        );
      }
      if (filter?.brand) {
        result = result.filter((p) => p.brand.toLowerCase() === filter.brand!.toLowerCase());
      }
      if (filter?.search) {
        const term = filter.search.toLowerCase().trim();
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term) ||
            p.brand.toLowerCase().includes(term) ||
            p.category.toLowerCase().includes(term)
        );
      }
      if (filter?.minPrice !== undefined && !isNaN(filter.minPrice)) {
        result = result.filter((p) => p.price >= filter.minPrice!);
      }
      if (filter?.maxPrice !== undefined && !isNaN(filter.maxPrice)) {
        result = result.filter((p) => p.price <= filter.maxPrice!);
      }
      if (filter?.minRating !== undefined && !isNaN(filter.minRating)) {
        result = result.filter((p) => (p.averageRating || 0) >= filter.minRating!);
      }
      if (filter?.featured) {
        result = result.filter((p) => p.isFeatured);
      }
      if (filter?.bestSeller) {
        result = result.filter((p) => p.isBestSeller);
      }
      if (filter?.deals) {
        result = result.filter((p) => p.isDealOfDay || p.discount >= 20);
      }

      return result;
    },
    findById: async (id: string): Promise<IProduct | null> => {
      return this.store.products.find((p) => p._id === id || p.slug === id) || null;
    },
    create: async (data: Partial<IProduct>): Promise<IProduct> => {
      let baseSlug = (data.name || 'product')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      if (!baseSlug) baseSlug = 'product';

      let slug = data.slug || baseSlug;
      let counter = 1;
      while (this.store.products.some((p) => p.slug === slug)) {
        slug = `${baseSlug}-${counter++}`;
      }

      let sku = data.sku || 'SKU-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      let skuCounter = 1;
      while (this.store.products.some((p) => p.sku === sku)) {
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

      const newProduct: IProduct = {
        _id: data._id || 'prod_' + Math.random().toString(36).substring(2, 9),
        name: (data.name || 'Untitled Product').trim(),
        slug,
        description: data.description || '',
        brand: data.brand || 'Generic',
        category: data.category || 'Electronics',
        subCategory: data.subCategory || '',
        images:
          data.images && data.images.length > 0
            ? data.images
            : [
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
              ],
        price,
        originalPrice,
        discount: data.discount !== undefined ? Number(data.discount) : discount,
        stock: Math.max(0, Number(data.stock) || 0),
        sku,
        specifications: data.specifications || [],
        averageRating: data.averageRating !== undefined ? Number(data.averageRating) : 0,
        numReviews: data.numReviews !== undefined ? Number(data.numReviews) : 0,
        isFeatured: Boolean(data.isFeatured),
        isBestSeller: Boolean(data.isBestSeller),
        isDealOfDay: Boolean(data.isDealOfDay),
        isActive: data.isActive !== false,
        createdAt: data.createdAt || new Date().toISOString(),
      };
      this.store.products.unshift(newProduct);
      this.saveToDisk();
      return newProduct;
    },
    update: async (id: string, data: Partial<IProduct>): Promise<IProduct | null> => {
      const product = this.store.products.find((p) => p._id === id);
      if (!product) return null;

      if (data.price !== undefined || data.originalPrice !== undefined) {
        const finalPrice = data.price !== undefined ? Number(data.price) : product.price;
        let finalOrig =
          data.originalPrice !== undefined ? Number(data.originalPrice) : product.originalPrice;
        if (finalOrig > finalPrice && finalOrig > 0) {
          data.discount = Math.round(((finalOrig - finalPrice) / finalOrig) * 100);
        } else {
          finalOrig = finalPrice;
          data.discount = 0;
        }
        data.originalPrice = finalOrig;
        data.price = finalPrice;
      }

      if (data.sku && data.sku !== product.sku) {
        let sku = data.sku;
        let counter = 1;
        while (this.store.products.some((p) => p._id !== id && p.sku === sku)) {
          sku = `${data.sku}-${counter++}`;
        }
        data.sku = sku;
      }

      if (data.slug && data.slug !== product.slug) {
        let slug = data.slug;
        let counter = 1;
        while (this.store.products.some((p) => p._id !== id && p.slug === slug)) {
          slug = `${data.slug}-${counter++}`;
        }
        data.slug = slug;
      }

      Object.assign(product, data);
      this.saveToDisk();
      return product;
    },
    delete: async (id: string): Promise<boolean> => {
      const idx = this.store.products.findIndex((p) => p._id === id);
      if (idx === -1) return false;
      this.store.products.splice(idx, 1);
      this.saveToDisk();
      return true;
    },
    recomputeRating: async (productId: string): Promise<void> => {
      const approved = this.store.reviews.filter((r) => r.productId === productId && r.isApproved);
      const prod = this.store.products.find((p) => p._id === productId);
      if (prod) {
        prod.numReviews = approved.length;
        prod.averageRating =
          approved.length > 0
            ? Number((approved.reduce((s, r) => s + r.rating, 0) / approved.length).toFixed(1))
            : 0;
        this.saveToDisk();
      }
    },
    adjustStock: async (
      productId: string,
      quantityChange: number,
      reason: string,
      updatedBy: string
    ): Promise<boolean> => {
      const product = this.store.products.find((p) => p._id === productId);
      if (!product) return false;
      if (!reason || !reason.trim()) return false;

      const previousStock = product.stock;
      const newStock = previousStock + quantityChange;
      if (newStock < 0) return false;

      product.stock = newStock;

      const log: IInventoryLog = {
        id: 'log_' + Math.random().toString(36).substring(2, 9),
        productId: product._id,
        productName: product.name,
        previousStock,
        newStock,
        change: quantityChange,
        reason: reason.trim(),
        updatedBy: updatedBy || 'Admin',
        timestamp: new Date().toISOString(),
      };
      this.store.inventoryLogs.unshift(log);
      this.saveToDisk();
      return true;
    },
  };

  categories = {
    find: async (onlyActive: boolean = true): Promise<ICategory[]> => {
      let list = this.store.categories;
      if (onlyActive) list = list.filter((c) => c.isActive !== false);
      return list.map((c) => {
        const count = this.store.products.filter(
          (p) => p.category.toLowerCase() === c.name.toLowerCase()
        ).length;
        return { ...c, itemCount: count };
      });
    },
    findById: async (id: string): Promise<ICategory | null> => {
      return this.store.categories.find((c) => c._id === id || c.slug === id) || null;
    },
    create: async (data: Partial<ICategory>): Promise<ICategory> => {
      const slug = (data.name || 'category')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const newCat: ICategory = {
        _id: data._id || 'cat_' + Math.random().toString(36).substring(2, 8),
        name: data.name || 'New Category',
        slug: data.slug || slug,
        description: data.description || '',
        image:
          data.image ||
          'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=400&q=80',
        isActive: data.isActive !== false,
      };
      this.store.categories.push(newCat);
      this.saveToDisk();
      return newCat;
    },
    update: async (id: string, data: Partial<ICategory>): Promise<ICategory | null> => {
      const cat = this.store.categories.find((c) => c._id === id);
      if (!cat) return null;
      Object.assign(cat, data);
      this.saveToDisk();
      return cat;
    },
    delete: async (id: string): Promise<boolean> => {
      const idx = this.store.categories.findIndex((c) => c._id === id);
      if (idx === -1) return false;
      this.store.categories.splice(idx, 1);
      this.saveToDisk();
      return true;
    },
  };

  carts = {
    findByUserId: async (userId: string): Promise<ICart> => {
      let cart = this.store.carts.find((c) => c.userId === userId);
      if (!cart) {
        cart = {
          _id: 'cart_' + Math.random().toString(36).substring(2, 8),
          userId,
          items: [],
          updatedAt: new Date().toISOString(),
        };
        this.store.carts.push(cart);
        this.saveToDisk();
      }
      const populatedItems = cart.items
        .map((item) => {
          const product = this.store.products.find((p) => p._id === item.productId);
          return {
            ...item,
            product,
          };
        })
        .filter((item) => item.product !== undefined);
      return { ...cart, items: populatedItems };
    },
    addItem: async (userId: string, productId: string, quantity: number = 1): Promise<ICart> => {
      let cart = this.store.carts.find((c) => c.userId === userId);
      if (!cart) {
        cart = {
          _id: 'cart_' + Math.random().toString(36).substring(2, 8),
          userId,
          items: [],
          updatedAt: new Date().toISOString(),
        };
        this.store.carts.push(cart);
      }
      const itemIdx = cart.items.findIndex((i) => i.productId === productId);
      if (itemIdx > -1) {
        cart.items[itemIdx].quantity += quantity;
      } else {
        cart.items.push({ productId, quantity });
      }
      cart.updatedAt = new Date().toISOString();
      this.saveToDisk();
      return this.carts.findByUserId(userId);
    },
    updateItem: async (userId: string, productId: string, quantity: number): Promise<ICart> => {
      const cart = this.store.carts.find((c) => c.userId === userId);
      if (!cart) return this.carts.findByUserId(userId);

      const itemIdx = cart.items.findIndex((i) => i.productId === productId);
      if (itemIdx > -1) {
        if (quantity <= 0) {
          cart.items.splice(itemIdx, 1);
        } else {
          cart.items[itemIdx].quantity = quantity;
        }
        cart.updatedAt = new Date().toISOString();
        this.saveToDisk();
      }
      return this.carts.findByUserId(userId);
    },
    removeItem: async (userId: string, productId: string): Promise<ICart> => {
      const cart = this.store.carts.find((c) => c.userId === userId);
      if (!cart) return this.carts.findByUserId(userId);

      cart.items = cart.items.filter((i) => i.productId !== productId);
      cart.updatedAt = new Date().toISOString();
      this.saveToDisk();
      return this.carts.findByUserId(userId);
    },
    clearCart: async (userId: string): Promise<ICart> => {
      const cart = this.store.carts.find((c) => c.userId === userId);
      if (cart) {
        cart.items = [];
        cart.updatedAt = new Date().toISOString();
        this.saveToDisk();
      }
      return this.carts.findByUserId(userId);
    },
  };

  wishlists = {
    findByUserId: async (
      userId: string
    ): Promise<{ productIds: string[]; products: IProduct[] }> => {
      let w = this.store.wishlists.find((x) => x.userId === userId);
      if (!w) {
        w = {
          _id: 'wsh_' + Math.random().toString(36).substring(2, 8),
          userId,
          productIds: [],
          updatedAt: new Date().toISOString(),
        };
        this.store.wishlists.push(w);
        this.saveToDisk();
      }
      const products = w.productIds
        .map((pid) => this.store.products.find((p) => p._id === pid))
        .filter((p): p is IProduct => p !== undefined);

      return { productIds: w.productIds, products };
    },
    toggle: async (
      userId: string,
      productId: string
    ): Promise<{ inWishlist: boolean; productIds: string[] }> => {
      let w = this.store.wishlists.find((x) => x.userId === userId);
      if (!w) {
        w = {
          _id: 'wsh_' + Math.random().toString(36).substring(2, 8),
          userId,
          productIds: [],
          updatedAt: new Date().toISOString(),
        };
        this.store.wishlists.push(w);
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
      this.saveToDisk();
      return { inWishlist, productIds: w.productIds };
    },
  };

  orders = {
    find: async (filter?: IOrderFilter): Promise<IOrder[]> => {
      let list = [...this.store.orders];
      if (filter?.userId) {
        list = list.filter((o) => o.userId === filter.userId);
      }
      if (filter?.orderStatus && filter.orderStatus !== 'All') {
        list = list.filter((o) => o.orderStatus === filter.orderStatus);
      }
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    findById: async (id: string): Promise<IOrder | null> => {
      return this.store.orders.find((o) => o._id === id || o.orderNumber === id) || null;
    },
    create: async (data: Partial<IOrder>): Promise<IOrder> => {
      const orderNumber =
        'SK-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);
      const newOrder: IOrder = {
        _id: data._id || 'ord_' + Math.random().toString(36).substring(2, 9),
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
      };

      for (const item of newOrder.orderItems) {
        await this.products.adjustStock(
          item.productId,
          -item.quantity,
          `Sold in order #${newOrder.orderNumber}`,
          newOrder.userName
        );
      }

      this.store.orders.unshift(newOrder);
      this.saveToDisk();
      return newOrder;
    },
    update: async (id: string, updateData: Partial<IOrder>): Promise<IOrder | null> => {
      const order = this.store.orders.find((o) => o._id === id || o.orderNumber === id);
      if (!order) return null;
      Object.assign(order, updateData);
      this.saveToDisk();
      return order;
    },
    updateStatus: async (
      id: string,
      status: string,
      note?: string,
      updatedBy: string = 'Admin'
    ): Promise<IOrder | null> => {
      const order = this.store.orders.find((o) => o._id === id || o.orderNumber === id);
      if (!order) return null;

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

      if (status === 'Returned') {
        for (const item of order.orderItems) {
          await this.products.adjustStock(
            item.productId,
            item.quantity,
            `Restocked from returned order #${order.orderNumber}`,
            updatedBy
          );
        }
      }

      this.saveToDisk();
      return order;
    },
    cancel: async (
      id: string,
      reason?: string,
      cancelledBy: string = 'Customer'
    ): Promise<IOrder | null> => {
      const order = this.store.orders.find((o) => o._id === id || o.orderNumber === id);
      if (!order) return null;

      order.orderStatus = 'Cancelled';
      order.cancelReason = reason || 'Cancelled by ' + cancelledBy;

      if (!order.statusHistory) order.statusHistory = [];
      order.statusHistory.push({
        status: 'Cancelled',
        timestamp: new Date().toISOString(),
        note: `Cancelled: ${order.cancelReason}`,
      });

      if (order.paymentStatus === 'Paid') {
        order.paymentStatus = 'Refunded';
      }

      for (const item of order.orderItems) {
        await this.products.adjustStock(
          item.productId,
          item.quantity,
          `Restocked from cancelled order #${order.orderNumber}`,
          cancelledBy
        );
      }

      this.saveToDisk();
      return order;
    },
  };

  coupons = {
    find: async (onlyActive: boolean = true): Promise<ICoupon[]> => {
      let list = this.store.coupons;
      if (onlyActive) list = list.filter((c) => c.isActive);
      return list;
    },
    findById: async (id: string): Promise<ICoupon | null> => {
      return (
        this.store.coupons.find(
          (c) => c._id === id || c.code.toUpperCase() === id.toUpperCase().trim()
        ) || null
      );
    },
    findByCode: async (code: string): Promise<ICoupon | null> => {
      return (
        this.store.coupons.find((c) => c.code.toUpperCase() === code.toUpperCase().trim()) || null
      );
    },
    create: async (data: Partial<ICoupon>): Promise<ICoupon> => {
      const newCoupon: ICoupon = {
        _id: data._id || 'coup_' + Math.random().toString(36).substring(2, 8),
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
      };
      this.store.coupons.push(newCoupon);
      this.saveToDisk();
      return newCoupon;
    },
    update: async (id: string, data: Partial<ICoupon>): Promise<ICoupon | null> => {
      const c = this.store.coupons.find((x) => x._id === id);
      if (!c) return null;
      Object.assign(c, data);
      if (data.code) c.code = data.code.toUpperCase().trim();
      this.saveToDisk();
      return c;
    },
    delete: async (id: string): Promise<boolean> => {
      const idx = this.store.coupons.findIndex((c) => c._id === id);
      if (idx === -1) return false;
      this.store.coupons.splice(idx, 1);
      this.saveToDisk();
      return true;
    },
    incrementUsage: async (code: string): Promise<void> => {
      const c = await this.coupons.findByCode(code);
      if (c) {
        c.usedCount = (c.usedCount || 0) + 1;
        this.saveToDisk();
      }
    },
  };

  reviews = {
    find: async (): Promise<IReview[]> => {
      return [...this.store.reviews];
    },
    findByProductId: async (
      productId: string,
      onlyApproved: boolean = true
    ): Promise<IReview[]> => {
      let list = this.store.reviews.filter((r) => r.productId === productId);
      if (onlyApproved) list = list.filter((r) => r.isApproved);
      return list;
    },
    create: async (data: Partial<IReview>): Promise<IReview> => {
      const hasBought = this.store.orders.some(
        (o) =>
          o.userId === data.userId &&
          o.orderStatus !== 'Cancelled' &&
          o.orderStatus !== 'Refunded' &&
          o.orderItems.some((item) => item.productId === data.productId)
      );

      const rev: IReview = {
        _id: data._id || 'rev_' + Math.random().toString(36).substring(2, 8),
        productId: data.productId!,
        userId: data.userId || 'anon',
        userName: data.userName || 'Shopper',
        rating: Number(data.rating) || 5,
        title: data.title || '',
        comment: data.comment || '',
        isApproved: data.isApproved !== undefined ? Boolean(data.isApproved) : true,
        verifiedPurchase: Boolean(hasBought),
        createdAt: data.createdAt || new Date().toISOString(),
      };
      this.store.reviews.unshift(rev);
      await this.products.recomputeRating(data.productId!);
      this.saveToDisk();
      return rev;
    },
    approve: async (id: string, approved: boolean): Promise<boolean> => {
      const rev = this.store.reviews.find((r) => r._id === id);
      if (!rev) return false;
      rev.isApproved = approved;
      await this.products.recomputeRating(rev.productId);
      this.saveToDisk();
      return true;
    },
    delete: async (id: string): Promise<boolean> => {
      const idx = this.store.reviews.findIndex((r) => r._id === id);
      if (idx === -1) return false;
      const pid = this.store.reviews[idx].productId;
      this.store.reviews.splice(idx, 1);
      await this.products.recomputeRating(pid);
      this.saveToDisk();
      return true;
    },
  };

  inventoryLogs = {
    find: async (): Promise<IInventoryLog[]> => {
      return [...this.store.inventoryLogs];
    },
  };

  async getAnalytics(): Promise<any> {
    const validOrders = this.store.orders.filter(
      (o) =>
        o.orderStatus !== 'Cancelled' &&
        o.orderStatus !== 'Refunded' &&
        o.paymentStatus !== 'Failed' &&
        o.paymentStatus !== 'Refunded'
    );

    const totalRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = this.store.orders.length;
    const totalProducts = this.store.products.length;
    const totalCustomers = this.store.users.filter((u) => u.role === 'customer').length;
    const pendingOrders = this.store.orders.filter(
      (o) =>
        o.orderStatus === 'Pending' ||
        o.orderStatus === 'Processing' ||
        o.orderStatus === 'Confirmed'
    ).length;
    const deliveredOrders = this.store.orders.filter((o) => o.orderStatus === 'Delivered').length;
    const lowStockProducts = this.store.products.filter((p) => p.stock > 0 && p.stock <= 15).length;
    const outOfStockProducts = this.store.products.filter((p) => p.stock === 0).length;

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
    for (const order of this.store.orders) {
      if (
        order.orderStatus === 'Cancelled' ||
        order.orderStatus === 'Refunded' ||
        order.paymentStatus === 'Refunded'
      ) {
        continue;
      }
      for (const item of order.orderItems) {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { count: 0, revenue: 0 };
        }
        productSalesMap[item.productId].count += item.quantity;
        productSalesMap[item.productId].revenue += item.price * item.quantity;
      }
    }

    const topSellingProducts = Object.keys(productSalesMap)
      .map((pid) => {
        const prod = this.store.products.find((p) => p._id === pid);
        return {
          product: prod,
          unitsSold: productSalesMap[pid].count,
          totalRevenue: productSalesMap[pid].revenue,
        };
      })
      .filter((item) => item.product !== undefined)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);

    if (topSellingProducts.length < 3) {
      const extra = this.store.products
        .filter((p) => !topSellingProducts.some((t) => t.product?._id === p._id))
        .slice(0, 5 - topSellingProducts.length)
        .map((p, idx) => ({
          product: p,
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
      recentOrders: this.store.orders.slice(0, 5),
      recentCustomers: this.store.users.filter((u) => u.role === 'customer').slice(0, 5),
    };
  }
}
