import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, ChevronRight, Truck, Clock, AlertCircle } from 'lucide-react';
import { api } from '../services/api.ts';
import { IOrder } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const MyOrders: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/orders/my-orders');
        if (data.success && data.orders) {
          setOrders(data.orders);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  const filteredOrders = orders.filter((o) => {
    if (filter === 'active') {
      return ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery'].includes(
        o.orderStatus
      );
    }
    if (filter === 'delivered') return o.orderStatus === 'Delivered';
    if (filter === 'cancelled') return o.orderStatus === 'Cancelled';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F1F3F6] py-6">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Account &gt; Orders</div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              My Orders &amp; Tracking ({orders.length})
            </h1>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 p-1 rounded-md text-xs font-semibold">
            {(['all', 'active', 'delivered', 'cancelled'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded capitalize transition cursor-pointer ${
                  filter === tab
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border border-gray-200 shadow-xs">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">No Orders Found</h3>
            <p className="text-xs text-gray-500 mb-6 max-w-sm mx-auto">
              You haven't placed any orders matching this filter yet.
            </p>
            <Link
              to="/products"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-2.5 rounded shadow-xs transition"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order._id}
                className="bg-white rounded-lg shadow-xs border border-gray-200 p-5 hover:shadow-md transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-gray-900">
                      Order #{order.orderNumber}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded ${
                        order.orderStatus === 'Delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.orderStatus === 'Cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      ● {order.orderStatus}
                    </span>
                    <span className="text-xs font-black text-gray-900 ml-2">
                      ₹{order.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="py-4 space-y-3">
                  {order.orderItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <img
                        src={item.image}
                        alt=""
                        className="w-12 h-12 object-contain bg-gray-50 rounded border p-1 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/product/${item.productId}`}
                          className="font-bold text-xs text-gray-900 hover:text-blue-600 line-clamp-1"
                        >
                          {item.name}
                        </Link>
                        <div className="text-[11px] text-gray-500">
                          Qty: {item.quantity} | ₹{item.price.toLocaleString('en-IN')} each
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer action */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-gray-400" />
                    <span>
                      Deliver to: {order.shippingAddress.fullName}, {order.shippingAddress.pincode}
                    </span>
                  </div>
                  <Link
                    to={`/order/${order._id}`}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    View Details &amp; Invoice <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
