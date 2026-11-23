import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Truck,
  Printer,
  ChevronDown,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { IOrder } from '../../types.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { Link } from 'react-router-dom';

const ALL_STATUSES: IOrder['orderStatus'][] = [
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
];

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);
  const { showToast } = useToast();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (search) params.search = search;

      const { data } = await api.get('/admin/orders', { params });
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (err: any) {
      showToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleUpdateStatus = async (orderId: string, newStatus: IOrder['orderStatus']) => {
    try {
      const { data } = await api.patch(`/admin/orders/${orderId}/status`, {
        status: newStatus,
        note: `Status updated by Admin to ${newStatus}`,
      });
      if (data.success) {
        showToast(`Order status updated to ${newStatus}.`, 'success');
        setOrders(orders.map((o) => (o._id === orderId ? data.order : o)));
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(data.order);
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Status update failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Order Fulfillment &amp; Management
          </h1>
          <p className="text-xs text-gray-500">
            Process incoming orders, dispatch shipments, manage returns and track payment
            signatures.
          </p>
        </div>
        <div className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded shadow-xs">
          Total Records: <strong>{orders.length} orders</strong>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by order ID, customer name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600 font-medium"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-gray-500 font-semibold whitespace-nowrap">
            Filter Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-gray-300 rounded p-2 font-semibold bg-white cursor-pointer"
          >
            <option value="All">All Statuses</option>
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="p-3.5 pl-5">Order ID &amp; Date</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Total &amp; Mode</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5">Update Status</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o._id} className="hover:bg-blue-50/30 transition">
                  <td className="p-3.5 pl-5">
                    <span className="font-bold text-gray-900 block font-mono">{o.orderNumber}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(o.createdAt).toLocaleString()}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-gray-800 block">{o.userName}</span>
                    <span className="text-[11px] text-gray-500">{o.userEmail}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-gray-900 block text-sm">
                      ₹{o.totalAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-gray-500 font-semibold">
                      {o.paymentMethod}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        o.paymentStatus === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.paymentStatus === 'Refunded'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {o.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3.5">
                    {/* Status Dropdown */}
                    <select
                      value={o.orderStatus}
                      onChange={(e) => handleUpdateStatus(o._id, e.target.value as any)}
                      className="text-xs font-bold p-1.5 border border-gray-300 rounded bg-white shadow-xs focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      {ALL_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3.5 pr-5 text-right">
                    <button
                      onClick={() => setSelectedOrder(o)}
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-2.5 py-1.5 rounded transition cursor-pointer"
                    >
                      Details &amp; Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details & Invoice Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <div>
                <span className="font-mono text-gray-500 uppercase text-[10px]">Order Invoice</span>
                <h3 className="font-black text-lg text-gray-900">#{selectedOrder.orderNumber}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border mb-4">
              <div>
                <span className="text-gray-500 font-bold block mb-1">Customer &amp; Shipping</span>
                <p className="font-bold text-gray-900">{selectedOrder.shippingAddress.fullName}</p>
                <p>{selectedOrder.shippingAddress.street}</p>
                <p>
                  {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} -{' '}
                  {selectedOrder.shippingAddress.pincode}
                </p>
                <p className="mt-1 text-gray-500">Phone: {selectedOrder.shippingAddress.phone}</p>
              </div>
              <div>
                <span className="text-gray-500 font-bold block mb-1">Payment &amp; Status</span>
                <p>
                  Payment: <strong className="text-gray-900">{selectedOrder.paymentMethod}</strong>{' '}
                  ({selectedOrder.paymentStatus})
                </p>
                <p>
                  Current Status:{' '}
                  <strong className="text-blue-600">{selectedOrder.orderStatus}</strong>
                </p>
                <p className="text-gray-400 mt-1">
                  Placed: {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Items */}
            <div className="border border-gray-200 rounded divide-y divide-gray-100 mb-4">
              {selectedOrder.orderItems.map((item, i) => (
                <div key={i} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={item.image}
                      alt=""
                      className="w-10 h-10 object-contain rounded border p-1"
                    />
                    <div>
                      <span className="font-bold text-gray-900 block">{item.name}</span>
                      <span className="text-gray-500">Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="text-right space-y-1 pr-2 mb-4">
              <div>
                Subtotal: <strong>₹{selectedOrder.subtotal.toLocaleString('en-IN')}</strong>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="text-emerald-600 font-bold">
                  Coupon Savings: -₹{selectedOrder.discount.toLocaleString('en-IN')}
                </div>
              )}
              <div className="text-base font-black text-gray-900 pt-1 border-t">
                Total: ₹{selectedOrder.totalAmount.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="bg-blue-600 text-white font-bold px-5 py-2 rounded shadow cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
