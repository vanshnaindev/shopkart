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

export interface IProductFilter {
  category?: string;
  brand?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  featured?: boolean;
  bestSeller?: boolean;
  deals?: boolean;
  activeOnly?: boolean;
}

export interface IOrderFilter {
  userId?: string;
  orderStatus?: string;
}

export interface IUserRepository {
  find(): Promise<IUser[]>;
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  create(data: Partial<IUser>): Promise<IUser>;
  update(id: string, data: Partial<IUser>): Promise<IUser | null>;
  delete(id: string): Promise<boolean>;
}

export interface IProductRepository {
  find(filter?: IProductFilter): Promise<IProduct[]>;
  findById(id: string): Promise<IProduct | null>;
  create(data: Partial<IProduct>): Promise<IProduct>;
  update(id: string, data: Partial<IProduct>): Promise<IProduct | null>;
  delete(id: string): Promise<boolean>;
  recomputeRating(productId: string): Promise<void>;
  adjustStock(
    productId: string,
    quantityChange: number,
    reason: string,
    updatedBy: string
  ): Promise<boolean>;
}

export interface ICategoryRepository {
  find(onlyActive?: boolean): Promise<ICategory[]>;
  findById(id: string): Promise<ICategory | null>;
  create(data: Partial<ICategory>): Promise<ICategory>;
  update(id: string, data: Partial<ICategory>): Promise<ICategory | null>;
  delete(id: string): Promise<boolean>;
}

export interface ICartRepository {
  findByUserId(userId: string): Promise<ICart>;
  addItem(userId: string, productId: string, quantity: number): Promise<ICart>;
  updateItem(userId: string, productId: string, quantity: number): Promise<ICart>;
  removeItem(userId: string, productId: string): Promise<ICart>;
  clearCart(userId: string): Promise<ICart>;
}

export interface IWishlistRepository {
  findByUserId(userId: string): Promise<{ productIds: string[]; products: IProduct[] }>;
  toggle(userId: string, productId: string): Promise<{ inWishlist: boolean; productIds: string[] }>;
}

export interface IOrderRepository {
  find(filter?: IOrderFilter): Promise<IOrder[]>;
  findById(id: string): Promise<IOrder | null>;
  create(data: Partial<IOrder>): Promise<IOrder>;
  update(id: string, data: Partial<IOrder>): Promise<IOrder | null>;
  updateStatus(
    id: string,
    status: string,
    note?: string,
    updatedBy?: string
  ): Promise<IOrder | null>;
  cancel(id: string, reason?: string, cancelledBy?: string): Promise<IOrder | null>;
}

export interface ICouponRepository {
  find(onlyActive?: boolean): Promise<ICoupon[]>;
  findById(id: string): Promise<ICoupon | null>;
  findByCode(code: string): Promise<ICoupon | null>;
  create(data: Partial<ICoupon>): Promise<ICoupon>;
  update(id: string, data: Partial<ICoupon>): Promise<ICoupon | null>;
  delete(id: string): Promise<boolean>;
  incrementUsage(code: string): Promise<void>;
}

export interface IReviewRepository {
  find(): Promise<IReview[]>;
  findByProductId(productId: string, onlyApproved?: boolean): Promise<IReview[]>;
  create(data: Partial<IReview>): Promise<IReview>;
  approve(id: string, approved: boolean): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}

export interface IInventoryLogRepository {
  find(): Promise<IInventoryLog[]>;
}

export interface IRepository {
  readonly mode: 'json' | 'mongodb';
  users: IUserRepository;
  products: IProductRepository;
  categories: ICategoryRepository;
  carts: ICartRepository;
  wishlists: IWishlistRepository;
  orders: IOrderRepository;
  coupons: ICouponRepository;
  reviews: IReviewRepository;
  inventoryLogs: IInventoryLogRepository;
  getAnalytics(): Promise<any>;
  resetDatabase(): Promise<void>;
}
