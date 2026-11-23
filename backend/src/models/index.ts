import mongoose, { Schema } from 'mongoose';
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

// User Schema
const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true, default: '' },
    password: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    isBlocked: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Number, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Number, default: null },
    tokenVersion: { type: Number, default: 0 },
    addresses: [
      {
        id: { type: String, required: true },
        fullName: String,
        phone: String,
        street: String,
        city: String,
        state: String,
        pincode: String,
        isDefault: Boolean,
        type: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
      },
    ],
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

// Product Schema
const ProductSchema = new Schema<IProduct>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: '' },
    brand: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    subCategory: { type: String, default: '' },
    images: [{ type: String }],
    price: { type: Number, required: true, min: 0, index: true },
    originalPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    sku: { type: String, required: true, unique: true, index: true },
    specifications: [
      {
        name: String,
        value: String,
      },
    ],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false, index: true },
    isBestSeller: { type: Boolean, default: false, index: true },
    isDealOfDay: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdAt: { type: String, default: () => new Date().toISOString(), index: true },
  },
  { timestamps: true }
);

// Search & Filter Indexes
ProductSchema.index({ name: 'text', description: 'text', brand: 'text', category: 'text' });
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ brand: 1, isActive: 1 });
ProductSchema.index({ price: 1, isActive: 1 });
ProductSchema.index({ createdAt: -1 });

// Category Schema
const CategorySchema = new Schema<ICategory>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    parentCategory: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Cart Schema
const CartSchema = new Schema<ICart>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, unique: true, index: true },
    items: [
      {
        productId: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1, default: 1 },
        selectedColor: String,
        selectedSize: String,
      },
    ],
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

// Wishlist Schema
const WishlistSchema = new Schema<IWishlist>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, unique: true, index: true },
    productIds: [{ type: String, required: true }],
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

// Order Schema
const OrderSchema = new Schema<IOrder>(
  {
    _id: { type: String, required: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userPhone: { type: String, default: '' },
    orderItems: [
      {
        productId: { type: String, required: true },
        name: { type: String, required: true },
        image: { type: String, default: '' },
        price: { type: Number, required: true },
        originalPrice: Number,
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    shippingAddress: {
      id: String,
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      type: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
      isDefault: Boolean,
    },
    paymentMethod: { type: String, enum: ['COD', 'Razorpay', 'Card', 'UPI'], default: 'COD' },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
    },
    paymentReference: String,
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    couponCode: String,
    shippingCharge: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    orderStatus: {
      type: String,
      enum: [
        'Pending',
        'Confirmed',
        'Processing',
        'Shipped',
        'Out for Delivery',
        'Delivered',
        'Cancelled',
        'Return Requested',
        'Returned',
        'Refunded',
      ],
      default: 'Confirmed',
      index: true,
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: String, default: () => new Date().toISOString() },
        note: String,
      },
    ],
    cancelReason: String,
    returnReason: String,
    createdAt: { type: String, default: () => new Date().toISOString(), index: true },
  },
  { timestamps: true }
);

OrderSchema.index({ userId: 1, createdAt: -1 });

// Coupon Schema
const CouponSchema = new Schema<ICoupon>(
  {
    _id: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true },
    minimumOrderAmount: { type: Number, default: 0 },
    maxDiscount: Number,
    expiryDate: { type: String, required: true },
    usageLimit: { type: Number, default: 1000 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    description: String,
  },
  { timestamps: true }
);

// Review Schema
const ReviewSchema = new Schema<IReview>(
  {
    _id: { type: String, required: true },
    productId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: String,
    comment: { type: String, required: true },
    isApproved: { type: Boolean, default: true },
    verifiedPurchase: { type: Boolean, default: false },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

ReviewSchema.index({ productId: 1, isApproved: 1 });

// Inventory Log Schema
const InventoryLogSchema = new Schema<IInventoryLog>(
  {
    _id: { type: String, default: () => 'log_' + Math.random().toString(36).substring(2, 9) },
    id: { type: String, required: true, unique: true, index: true },
    productId: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    change: { type: Number, required: true },
    reason: { type: String, required: true },
    updatedBy: { type: String, required: true },
    timestamp: { type: String, default: () => new Date().toISOString(), index: true },
  },
  { timestamps: true }
);

InventoryLogSchema.index({ productId: 1, timestamp: -1 });

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const ProductModel =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
export const CategoryModel =
  mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
export const CartModel = mongoose.models.Cart || mongoose.model<ICart>('Cart', CartSchema);
export const WishlistModel =
  mongoose.models.Wishlist || mongoose.model<IWishlist>('Wishlist', WishlistSchema);
export const OrderModel = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
export const CouponModel =
  mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', CouponSchema);
export const ReviewModel =
  mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
export const InventoryLogModel =
  mongoose.models.InventoryLog || mongoose.model<IInventoryLog>('InventoryLog', InventoryLogSchema);
