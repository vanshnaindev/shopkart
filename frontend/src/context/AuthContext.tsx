import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser, IUserAddress } from '../types.ts';
import { api } from '../services/api.ts';
import { useToast } from './ToastContext.tsx';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, phone: string, password: string) => Promise<boolean>;
  logout: () => void;
  quickDemoLogin: (role: 'admin' | 'customer') => Promise<void>;
  updateProfile: (data: Partial<IUser>) => Promise<boolean>;
  addAddress: (address: Omit<IUserAddress, 'id'>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('shopkart_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchMe = async () => {
      const storedToken = localStorage.getItem('shopkart_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem('shopkart_token');
          setToken(null);
        }
      } catch (err) {
        localStorage.removeItem('shopkart_token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.success && data.token) {
        localStorage.setItem('shopkart_token', data.token);
        setToken(data.token);
        setUser(data.user);
        showToast(`Welcome back, ${data.user.name}!`, 'success');
        return true;
      }
      return false;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      showToast(msg, 'error');
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    phone: string,
    password: string
  ): Promise<boolean> => {
    try {
      const { data } = await api.post('/auth/register', { name, email, phone, password });
      if (data.success && data.token) {
        localStorage.setItem('shopkart_token', data.token);
        setToken(data.token);
        setUser(data.user);
        showToast(`Welcome to ShopKart, ${data.user.name}!`, 'success');
        return true;
      }
      return false;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed.';
      showToast(msg, 'error');
      return false;
    }
  };

  const quickDemoLogin = async (role: 'admin' | 'customer') => {
    if (role === 'admin') {
      await login('admin@shopkart.com', 'AdminPassword123!');
    } else {
      await login('customer@shopkart.com', 'Customer123!');
    }
  };

  const logout = () => {
    localStorage.removeItem('shopkart_token');
    setToken(null);
    setUser(null);
    showToast('Logged out successfully.', 'info');
  };

  const updateProfile = async (data: Partial<IUser>): Promise<boolean> => {
    try {
      const res = await api.put('/auth/profile', data);
      if (res.data.success) {
        setUser(res.data.user);
        showToast('Profile updated successfully!', 'success');
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update profile', 'error');
      return false;
    }
  };

  const addAddress = async (address: Omit<IUserAddress, 'id'>): Promise<boolean> => {
    try {
      const res = await api.post('/auth/address', address);
      if (res.data.success) {
        setUser(res.data.user);
        showToast('Address saved successfully!', 'success');
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save address', 'error');
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin: user?.role === 'admin',
        login,
        register,
        logout,
        quickDemoLogin,
        updateProfile,
        addAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
