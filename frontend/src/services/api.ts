import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('shopkart_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 and 403 status codes consistently
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    if (status === 401) {
      // Token expired or invalid
      localStorage.removeItem('shopkart_token');
      localStorage.removeItem('shopkart_user');
      window.dispatchEvent(new CustomEvent('shopkart:auth_error', { detail: { status: 401 } }));

      if (
        currentPath.startsWith('/admin') ||
        currentPath.startsWith('/profile') ||
        currentPath.startsWith('/orders') ||
        currentPath.startsWith('/checkout')
      ) {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    } else if (status === 403) {
      // Forbidden: deactivation / blocked or insufficient permissions
      const message = error.response?.data?.message || 'Access denied.';
      window.dispatchEvent(
        new CustomEvent('shopkart:forbidden', { detail: { message, status: 403 } })
      );

      // If user account is deactivated / blocked, clear credentials and redirect to login
      if (
        message.toLowerCase().includes('deactivated') ||
        message.toLowerCase().includes('blocked')
      ) {
        localStorage.removeItem('shopkart_token');
        localStorage.removeItem('shopkart_user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
