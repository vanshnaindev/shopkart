import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api.ts';

interface IAnalytics {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  pendingOrders: number;
  deliveredOrders: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  monthlySales: { month: string; revenue: number; orders: number }[];
  weeklySales: { day: string; sales: number; orders: number }[];
  topSellingProducts: { product: any; unitsSold: number; totalRevenue: number }[];
  recentOrders: any[];
  recentCustomers: any[];
}

export const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<IAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/admin/dashboard');
        if (data.success && data.analytics) {
          setAnalytics(data.analytics);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading || !analytics) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-xs text-gray-500 font-semibold">
          Calculating database metrics &amp; charts...
        </p>
      </div>
    );
  }

  const maxMonthlyRevenue = Math.max(...analytics.monthlySales.map((m) => m.revenue), 1);
  const maxWeeklySales = Math.max(...analytics.weeklySales.map((w) => w.sales), 1);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Admin Overview</h1>
          <p className="text-xs text-gray-500">
            Real-time business performance analytics computed from active database records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/reports"
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 text-xs font-bold px-3 py-2 rounded shadow-xs"
          >
            Export Reports (CSV)
          </Link>
          <Link
            to="/admin/products"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded shadow-xs"
          >
            + Add Product
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            ₹{analytics.totalRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Calculated from confirmed orders
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {analytics.totalOrders.toLocaleString()}
          </div>
          <div className="text-[11px] text-blue-600 font-semibold mt-1">
            {analytics.deliveredOrders} Delivered • {analytics.pendingOrders} Active
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Catalog Products</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {analytics.totalProducts.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-600 font-semibold mt-1">
            {analytics.lowStockProducts} Low Stock alert (&lt;15)
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Customers</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {analytics.totalCustomers.toLocaleString()}
          </div>
          <div className="text-[11px] text-indigo-600 font-semibold mt-1">
            Registered customer accounts
          </div>
        </div>
      </div>

      {/* Secondary Status Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-xs flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <div className="text-gray-600">Pending Orders</div>
            <div className="font-bold text-gray-900 text-sm">{analytics.pendingOrders}</div>
          </div>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div className="text-gray-600">Delivered Orders</div>
            <div className="font-bold text-gray-900 text-sm">{analytics.deliveredOrders}</div>
          </div>
        </div>
        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <div className="text-gray-600">Low Stock (&le;15)</div>
            <div className="font-bold text-gray-900 text-sm">{analytics.lowStockProducts}</div>
          </div>
        </div>
        <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <div className="text-gray-600">Out of Stock</div>
            <div className="font-bold text-gray-900 text-sm">{analytics.outOfStockProducts}</div>
          </div>
        </div>
      </div>

      {/* Charts Section: Monthly Revenue & Weekly Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Monthly Revenue Trend</h3>
              <p className="text-[11px] text-gray-400">Past 6 months performance</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
              Monthly Active
            </span>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-6 px-2">
            {analytics.monthlySales.map((item) => {
              const heightPercent = Math.max(
                15,
                Math.round((item.revenue / maxMonthlyRevenue) * 100)
              );
              return (
                <div
                  key={item.month}
                  className="flex-1 flex flex-col items-center gap-2 group relative"
                >
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition absolute -top-10 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded shadow whitespace-nowrap pointer-events-none z-10">
                    ₹{item.revenue.toLocaleString()} ({item.orders} orders)
                  </div>
                  {/* Bar */}
                  <div className="w-full bg-blue-100 rounded-t group-hover:bg-blue-600 transition-colors flex items-end h-44 overflow-hidden">
                    <div
                      className="w-full bg-blue-600 group-hover:bg-blue-700 transition-all rounded-t"
                      style={{ height: `${heightPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-[11px] font-bold text-gray-600">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Sales Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Weekly Sales Volume</h3>
              <p className="text-[11px] text-gray-400">Last 7 days order distribution</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Day-by-Day
            </span>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-6 px-2">
            {analytics.weeklySales.map((item) => {
              const heightPercent = Math.max(12, Math.round((item.sales / maxWeeklySales) * 100));
              return (
                <div
                  key={item.day}
                  className="flex-1 flex flex-col items-center gap-2 group relative"
                >
                  <div className="opacity-0 group-hover:opacity-100 transition absolute -top-10 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded shadow whitespace-nowrap pointer-events-none z-10">
                    ₹{item.sales.toLocaleString()}
                  </div>
                  <div className="w-full bg-emerald-100 rounded-t group-hover:bg-emerald-600 transition-colors flex items-end h-44 overflow-hidden">
                    <div
                      className="w-full bg-emerald-500 group-hover:bg-emerald-600 transition-all rounded-t"
                      style={{ height: `${heightPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-[11px] font-bold text-gray-600">{item.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Orders & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-7 bg-white rounded-xl p-6 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <h3 className="font-bold text-gray-900 text-sm">Recent Customer Orders</h3>
            <Link
              to="/admin/orders"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-gray-100 overflow-x-auto text-xs">
            {analytics.recentOrders.map((order) => (
              <div key={order._id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-gray-900">{order.orderNumber}</div>
                  <div className="text-[11px] text-gray-500">
                    {order.userName} • {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      order.orderStatus === 'Delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : order.orderStatus === 'Cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {order.orderStatus}
                  </span>
                  <span className="font-bold text-gray-900 w-20 text-right">
                    ₹{order.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="lg:col-span-5 bg-white rounded-xl p-6 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <h3 className="font-bold text-gray-900 text-sm">Top Selling Products</h3>
            <Link
              to="/admin/products"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Catalog <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {analytics.topSellingProducts.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-xs"
              >
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-black text-[11px] flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <img
                  src={item.product?.images?.[0]}
                  alt=""
                  className="w-10 h-10 object-contain rounded bg-white border p-1 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 truncate">{item.product?.name}</div>
                  <div className="text-[11px] text-gray-500">
                    {item.unitsSold} units sold • ₹{item.totalRevenue.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
