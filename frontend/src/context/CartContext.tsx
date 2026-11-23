import React, { createContext, useContext, useState, useEffect } from 'react';
import { ICartItem, IProduct, ICoupon } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from './AuthContext.tsx';
import { useToast } from './ToastContext.tsx';

interface CartContextType {
  items: ICartItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  coupon: ICoupon | null;
  shippingCharge: number;
  totalAmount: number;
  loading: boolean;
  addToCart: (product: IProduct, quantity?: number) => Promise<boolean>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ICartItem[]>([]);
  const [coupon, setCoupon] = useState<ICoupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const { user, token } = useAuth();
  const { showToast } = useToast();

  // Fetch cart when authenticated, merging any guest cart items first
  const fetchCart = async () => {
    if (!token) {
      // Load guest cart from local storage
      const localCart = localStorage.getItem('shopkart_guest_cart');
      if (localCart) {
        try {
          setItems(JSON.parse(localCart));
        } catch (e) {
          setItems([]);
        }
      } else {
        setItems([]);
      }
      return;
    }

    try {
      setLoading(true);

      // Merge guest cart if present
      const guestCartRaw = localStorage.getItem('shopkart_guest_cart');
      if (guestCartRaw) {
        try {
          const guestItems: ICartItem[] = JSON.parse(guestCartRaw);
          if (Array.isArray(guestItems) && guestItems.length > 0) {
            const { data: currentCartRes } = await api.get('/cart');
            const serverItems: ICartItem[] = currentCartRes?.cart?.items || [];

            for (const gItem of guestItems) {
              if (!gItem.productId || gItem.quantity <= 0) continue;

              let stock = gItem.product?.stock;
              if (stock === undefined) {
                try {
                  const pRes = await api.get(`/products/${gItem.productId}`);
                  stock = pRes.data?.product?.stock;
                } catch {}
              }

              const availableStock = typeof stock === 'number' ? stock : 999;
              if (availableStock <= 0) continue;

              const existingServerItem = serverItems.find((s) => s.productId === gItem.productId);
              const currentQty = existingServerItem ? existingServerItem.quantity : 0;
              const maxAddable = Math.max(0, availableStock - currentQty);
              const qtyToAdd = Math.min(gItem.quantity, maxAddable);

              if (qtyToAdd > 0) {
                await api.post('/cart', { productId: gItem.productId, quantity: qtyToAdd });
              }
            }
          }
        } catch (err) {
          console.error('Failed to merge guest cart:', err);
        } finally {
          localStorage.removeItem('shopkart_guest_cart');
        }
      }

      const { data } = await api.get('/cart');
      if (data.success && data.cart) {
        setItems(data.cart.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user?._id, token]);

  const saveGuestCart = (newItems: ICartItem[]) => {
    setItems(newItems);
    localStorage.setItem('shopkart_guest_cart', JSON.stringify(newItems));
  };

  const addToCart = async (product: IProduct, quantity: number = 1): Promise<boolean> => {
    if (product.stock < quantity) {
      showToast(`Only ${product.stock} items remaining in stock!`, 'error');
      return false;
    }

    if (!token) {
      // Guest cart
      const existing = items.find((i) => i.productId === product._id);
      let updated: ICartItem[];
      if (existing) {
        if (existing.quantity + quantity > product.stock) {
          showToast(`Cannot add more. Reached max available stock (${product.stock})`, 'error');
          return false;
        }
        updated = items.map((i) =>
          i.productId === product._id ? { ...i, quantity: i.quantity + quantity } : i
        );
      } else {
        updated = [...items, { productId: product._id, product, quantity }];
      }
      saveGuestCart(updated);
      showToast(`Added ${product.name} to cart!`, 'success');
      return true;
    }

    try {
      const { data } = await api.post('/cart', { productId: product._id, quantity });
      if (data.success && data.cart) {
        setItems(data.cart.items);
        showToast(`Added "${product.name}" to cart!`, 'success');
        return true;
      }
      return false;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to add item to cart';
      showToast(msg, 'error');
      return false;
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    if (!token) {
      const updated = items.map((i) => (i.productId === productId ? { ...i, quantity } : i));
      saveGuestCart(updated);
      return;
    }

    try {
      const { data } = await api.put(`/cart/${productId}`, { quantity });
      if (data.success && data.cart) {
        setItems(data.cart.items);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update quantity', 'error');
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!token) {
      const updated = items.filter((i) => i.productId !== productId);
      saveGuestCart(updated);
      showToast('Item removed from cart', 'info');
      return;
    }

    try {
      const { data } = await api.delete(`/cart/${productId}`);
      if (data.success && data.cart) {
        setItems(data.cart.items);
        showToast('Item removed from cart', 'info');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to remove item', 'error');
    }
  };

  const clearCart = async () => {
    if (!token) {
      saveGuestCart([]);
      return;
    }
    try {
      await api.delete('/cart');
      setItems([]);
      setCoupon(null);
      setCouponDiscount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const subtotal = items.reduce((sum, item) => {
    const price = item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  const applyCoupon = async (code: string): Promise<boolean> => {
    if (!code.trim()) {
      showToast('Please enter a coupon code', 'error');
      return false;
    }
    try {
      const { data } = await api.post('/coupons/validate', { code, cartTotal: subtotal });
      if (data.success && data.valid) {
        setCoupon(data.coupon);
        setCouponDiscount(data.discountAmount);
        showToast(data.message, 'success');
        return true;
      }
      return false;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid coupon code';
      showToast(msg, 'error');
      return false;
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponDiscount(0);
    showToast('Coupon removed', 'info');
  };

  // Re-verify coupon discount if subtotal changes
  useEffect(() => {
    if (coupon) {
      if (subtotal < coupon.minimumOrderAmount) {
        setCoupon(null);
        setCouponDiscount(0);
        showToast(
          `Coupon removed: Cart value must be at least ₹${coupon.minimumOrderAmount}`,
          'info'
        );
      } else if (coupon.discountType === 'percentage') {
        let disc = Math.round((subtotal * coupon.discountValue) / 100);
        if (coupon.maxDiscount && disc > coupon.maxDiscount) {
          disc = coupon.maxDiscount;
        }
        setCouponDiscount(disc);
      }
    }
  }, [subtotal]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const shippingCharge = subtotal > 500 || subtotal === 0 ? 0 : 40;
  const totalAmount = Math.max(0, subtotal - couponDiscount + shippingCharge);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        discount: couponDiscount,
        coupon,
        shippingCharge,
        totalAmount,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
