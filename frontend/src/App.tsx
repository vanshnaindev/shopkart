import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { CartProvider } from './context/CartContext.tsx';
import { WishlistProvider } from './context/WishlistContext.tsx';

// Common Components
import { DemoBanner } from './components/common/DemoBanner.tsx';
import { Navbar } from './components/common/Navbar.tsx';
import { Footer } from './components/common/Footer.tsx';

// Customer Pages
import { Home } from './pages/Home.tsx';
import { Products } from './pages/Products.tsx';
import { ProductDetails } from './pages/ProductDetails.tsx';
import { Cart } from './pages/Cart.tsx';
import { Wishlist } from './pages/Wishlist.tsx';
import { Checkout } from './pages/Checkout.tsx';
import { OrderConfirmation } from './pages/OrderConfirmation.tsx';
import { OrderDetails } from './pages/OrderDetails.tsx';
import { MyOrders } from './pages/MyOrders.tsx';
import { Profile } from './pages/Profile.tsx';
import { Login } from './pages/Login.tsx';
import { Register } from './pages/Register.tsx';
import { NotFound } from './pages/NotFound.tsx';

// Admin Pages
import { AdminLayout } from './pages/admin/AdminLayout.tsx';
import { AdminDashboard } from './pages/admin/AdminDashboard.tsx';
import { AdminProducts } from './pages/admin/AdminProducts.tsx';
import { AdminCategories } from './pages/admin/AdminCategories.tsx';
import { AdminOrders } from './pages/admin/AdminOrders.tsx';
import { AdminCustomers } from './pages/admin/AdminCustomers.tsx';
import { AdminInventory } from './pages/admin/AdminInventory.tsx';
import { AdminCoupons } from './pages/admin/AdminCoupons.tsx';
import { AdminReviews } from './pages/admin/AdminReviews.tsx';
import { AdminReports } from './pages/admin/AdminReports.tsx';

// Layout wrapper to hide customer Navbar & Footer on Admin routes
const AppLayout: React.FC = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Demo Banner for easy testing on both customer & admin views */}
      <DemoBanner />

      {!isAdminRoute && <Navbar />}

      <div className="flex-1">
        <Routes>
          {/* Customer Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
          <Route path="/order/:id" element={<OrderDetails />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      {!isAdminRoute && <Footer />}
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <BrowserRouter>
              <AppLayout />
            </BrowserRouter>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
