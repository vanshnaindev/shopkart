import React, { useState } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  Users,
  Boxes,
  Tag,
  MessageSquare,
  BarChart3,
  LogOut,
  Store,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

const NAV_ITEMS = [
  { label: 'Overview', icon: LayoutDashboard, path: '/admin' },
  { label: 'Products', icon: Package, path: '/admin/products' },
  { label: 'Categories', icon: Layers, path: '/admin/categories' },
  { label: 'Orders', icon: ShoppingCart, path: '/admin/orders' },
  { label: 'Customers', icon: Users, path: '/admin/customers' },
  { label: 'Inventory', icon: Boxes, path: '/admin/inventory' },
  { label: 'Coupons', icon: Tag, path: '/admin/coupons' },
  { label: 'Reviews', icon: MessageSquare, path: '/admin/reviews' },
  { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
];

export const AdminLayout: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Security guard: If user not logged in or not admin, redirect or show login prompt
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-xl max-w-md w-full text-center border border-slate-700 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Restricted Administrator Area</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            You must be logged in with an authorized Administrator account to view the ShopKart
            management portal.
          </p>
          <div className="space-y-3">
            <Link
              to="/login"
              className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded text-xs transition"
            >
              Sign In as Administrator
            </Link>
            <Link
              to="/"
              className="block w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-2.5 rounded text-xs transition"
            >
              Back to Customer Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-1 rounded hover:bg-slate-800"
          >
            {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <span className="font-black text-lg text-white">
            Shop<span className="text-yellow-400">Kart</span>{' '}
            <span className="text-xs text-blue-400">ADMIN</span>
          </span>
        </div>
        <Link to="/" className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
          <Store className="w-4 h-4" /> Store
        </Link>
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          mobileSidebarOpen ? 'block' : 'hidden'
        } md:block w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 md:min-h-screen border-r border-slate-800 z-30`}
      >
        {/* Brand */}
        <div className="p-5 border-b border-slate-800 hidden md:flex items-center justify-between">
          <Link to="/admin" className="flex flex-col">
            <div className="flex items-center gap-1 text-xl font-black text-white italic">
              Shop<span className="text-yellow-400">Kart</span>
              <span className="bg-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded not-italic text-white ml-1">
                PORTAL
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">v2.4 Production Build</span>
          </Link>
        </div>

        {/* Current Admin user tag */}
        <div className="p-4 mx-3 my-3 bg-slate-800/80 rounded-lg border border-slate-700/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 text-xs">
            <div className="font-bold text-white truncate">{user.name}</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Super Admin Active
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            to="/"
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <Store className="w-4 h-4 text-blue-400" />
            <span>Customer Store</span>
          </Link>
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
