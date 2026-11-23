import React, { createContext, useContext, useState, useEffect } from 'react';
import { IProduct } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from './AuthContext.tsx';
import { useToast } from './ToastContext.tsx';

interface WishlistContextType {
  productIds: string[];
  products: IProduct[];
  loading: boolean;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [productIds, setProductIds] = useState<string[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { token } = useAuth();
  const { showToast } = useToast();

  const fetchWishlist = async () => {
    if (!token) {
      // Local storage guest wishlist
      const local = localStorage.getItem('shopkart_guest_wishlist');
      if (local) {
        try {
          const ids = JSON.parse(local);
          setProductIds(ids);
        } catch (e) {
          setProductIds([]);
        }
      } else {
        setProductIds([]);
      }
      setProducts([]);
      return;
    }

    try {
      setLoading(true);

      // Merge guest wishlist if present
      const guestWishlistRaw = localStorage.getItem('shopkart_guest_wishlist');
      if (guestWishlistRaw) {
        try {
          const guestIds: string[] = JSON.parse(guestWishlistRaw);
          if (Array.isArray(guestIds) && guestIds.length > 0) {
            const { data: curWishlist } = await api.get('/wishlist');
            const serverIds: string[] = curWishlist?.wishlist?.productIds || [];
            for (const pid of guestIds) {
              if (pid && !serverIds.includes(pid)) {
                await api.post('/wishlist/toggle', { productId: pid });
              }
            }
          }
        } catch (err) {
          console.error('Failed to merge guest wishlist:', err);
        } finally {
          localStorage.removeItem('shopkart_guest_wishlist');
        }
      }

      const { data } = await api.get('/wishlist');
      if (data.success && data.wishlist) {
        setProductIds(data.wishlist.productIds || []);
        setProducts(data.wishlist.products || []);
      }
    } catch (err) {
      console.error('Failed to load wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [token]);

  const isInWishlist = (productId: string) => {
    return productIds.includes(productId);
  };

  const toggleWishlist = async (productId: string): Promise<boolean> => {
    if (!token) {
      const exists = productIds.includes(productId);
      const updated = exists
        ? productIds.filter((id) => id !== productId)
        : [...productIds, productId];
      setProductIds(updated);
      localStorage.setItem('shopkart_guest_wishlist', JSON.stringify(updated));
      showToast(
        exists ? 'Removed from Wishlist' : 'Saved to Wishlist!',
        exists ? 'info' : 'success'
      );
      return !exists;
    }

    try {
      const { data } = await api.post('/wishlist/toggle', { productId });
      if (data.success) {
        setProductIds(data.productIds);
        showToast(data.message, data.inWishlist ? 'success' : 'info');
        fetchWishlist();
        return data.inWishlist;
      }
      return false;
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update wishlist', 'error');
      return false;
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        productIds,
        products,
        loading,
        isInWishlist,
        toggleWishlist,
        refreshWishlist: fetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
};
