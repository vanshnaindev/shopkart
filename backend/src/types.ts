export interface IUserAddress {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
  type?: 'home' | 'work' | 'other';
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: 'customer' | 'admin';
  addresses: IUserAddress[];
  isBlocked: boolean;
  failedLoginAttempts?: number;
  lockUntil?: number | null;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: number | null;
  tokenVersion?: number;
  createdAt: string;
}

export interface IProductSpec {
  name: string;
  value: string;
}

export interface IProduct {
  _id: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  category: string;
  subCategory?: string;
  images: string[];
  price: number;
  originalPrice: number;
  discount: number;
  stock: number;
  sku: string;
  specifications: IProductSpec[];
  averageRating: number;
  numReviews: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isDealOfDay?: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image: string;
  parentCategory?: string;
  isActive: boolean;
  itemCount?: number;
}

export interface ICartItem {
  productId: string;
  product?: IProduct;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface ICart {
  _id: string;
  userId: string;
  items: ICartItem[];
  updatedAt: string;
}

export interface IWishlist {
  _id: string;
  userId: string;
  productIds: string[];
  updatedAt: string;
}

export interface IOrderItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  quantity: number;
}

export interface IOrderStatusHistory {
  status:
    | 'Pending'
    | 'Confirmed'
    | 'Processing'
    | 'Shipped'
    | 'Out for Delivery'
    | 'Delivered'
    | 'Cancelled'
    | 'Return Requested'
    | 'Returned'
    | 'Refunded';
  timestamp: string;
  note?: string;
}

export interface IOrder {
  _id: string;
  orderNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  orderItems: IOrderItem[];
  shippingAddress: IUserAddress;
  paymentMethod: 'COD' | 'Razorpay' | 'Card' | 'UPI';
  paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  paymentReference?: string;
  subtotal: number;
  discount: number;
  couponCode?: string;
  shippingCharge: number;
  totalAmount: number;
  orderStatus:
    | 'Pending'
    | 'Confirmed'
    | 'Processing'
    | 'Shipped'
    | 'Out for Delivery'
    | 'Delivered'
    | 'Cancelled'
    | 'Return Requested'
    | 'Returned'
    | 'Refunded';
  statusHistory: IOrderStatusHistory[];
  cancelReason?: string;
  returnReason?: string;
  createdAt: string;
}

export interface ICoupon {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderAmount: number;
  maxDiscount?: number;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  description?: string;
}

export interface IReview {
  _id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  isApproved: boolean;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface IInventoryLog {
  _id?: string;
  id: string;
  productId: string;
  productName: string;
  previousStock: number;
  newStock: number;
  change: number;
  reason: string;
  updatedBy: string;
  timestamp: string;
}
