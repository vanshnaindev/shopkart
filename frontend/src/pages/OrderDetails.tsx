import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Package,
  Printer,
  Truck,
  RotateCcw,
  XCircle,
  CheckCircle2,
  Clock,
  MapPin,
  CreditCard,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { IOrder } from '../types.ts';
import { useToast } from '../context/ToastContext.tsx';

const STATUS_STEPS = ['Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];

export const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Found a better price elsewhere');
  const [actionLoading, setActionLoading] = useState(false);
  const { showToast } = useToast();

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/orders/${id}`);
      if (data.success && data.order) {
        setOrder(data.order);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to fetch order details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F3F6] py-16 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F1F3F6] py-16 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Order Not Found</h2>
        <Link to="/orders" className="text-blue-600 font-semibold text-sm underline">
          View My Orders
        </Link>
      </div>
    );
  }

  const isCancellable = ['Pending', 'Confirmed', 'Processing'].includes(order.orderStatus);
  const isReturnable = order.orderStatus === 'Delivered';

  const handleCancelOrder = async () => {
    try {
      setActionLoading(true);
      const { data } = await api.patch(`/orders/${order._id}/cancel`, {
        reason: cancelReason,
      });
      if (data.success) {
        showToast('Order cancelled successfully.', 'success');
        setOrder(data.order);
        setCancelModalOpen(false);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Cancellation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestReturn = async () => {
    if (!window.confirm('Are you sure you want to request a return for this delivered order?'))
      return;
    try {
      setActionLoading(true);
      const { data } = await api.patch(`/orders/${order._id}/return`, {
        reason: 'Return requested by customer',
      });
      if (data.success) {
        showToast('Return request submitted. Executive will inspect upon pickup.', 'success');
        setOrder(data.order);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Return request failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Determine current step index in normal delivery pipeline
  const currentStepIdx = STATUS_STEPS.indexOf(order.orderStatus);

  return (
    <div className="min-h-screen bg-[#F1F3F6] py-6">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8">
        {/* Breadcrumb & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3 no-print">
          <div>
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Link to="/orders" className="hover:text-blue-600">
                My Orders
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>{order.orderNumber}</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              Order #{order.orderNumber}
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded ${
                  order.orderStatus === 'Delivered'
                    ? 'bg-emerald-100 text-emerald-800'
                    : order.orderStatus === 'Cancelled'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-blue-100 text-blue-800'
                }`}
              >
                {order.orderStatus}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-xs px-4 py-2 rounded shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Tax Invoice
            </button>

            {isCancellable && (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-300 hover:bg-rose-100 text-rose-700 font-bold text-xs px-4 py-2 rounded shadow-xs transition cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel Order
              </button>
            )}

            {isReturnable && (
              <button
                onClick={handleRequestReturn}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-800 font-bold text-xs px-4 py-2 rounded shadow-xs transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Request Return
              </button>
            )}
          </div>
        </div>

        {/* Visual Progress Tracker (Flipkart/Amazon style) */}
        {order.orderStatus !== 'Cancelled' && order.orderStatus !== 'Returned' && (
          <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-6 mb-6">
            <h3 className="font-bold text-gray-900 text-sm mb-6 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" /> Live Tracking Status
            </h3>

            <div className="relative flex items-center justify-between max-w-3xl mx-auto px-4">
              {/* Connecting line */}
              <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-1 bg-gray-200 -z-0">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${Math.max(0, (currentStepIdx / (STATUS_STEPS.length - 1)) * 100)}%`,
                  }}
                ></div>
              </div>

              {STATUS_STEPS.map((step, idx) => {
                const isPassed = currentStepIdx >= idx;
                const isCurrent = currentStepIdx === idx;

                return (
                  <div
                    key={step}
                    className="flex flex-col items-center text-center z-10 bg-white px-2"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all ${
                        isPassed
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-400 border border-gray-300'
                      } ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[11px] font-bold ${
                        isPassed ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancellation Notice Banner if Cancelled */}
        {order.orderStatus === 'Cancelled' && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-6 text-xs text-rose-800 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold text-sm block">This Order Has Been Cancelled</span>
              <span>All reserved product units have been restocked to the inventory.</span>
            </div>
          </div>
        )}

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" /> Delivery Address
            </h3>
            <div className="text-xs text-gray-700 space-y-1">
              <p className="font-bold text-gray-900 text-sm">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.street}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                <strong className="text-gray-900">{order.shippingAddress.pincode}</strong>
              </p>
              <p className="pt-2 text-gray-500 font-semibold">
                Phone: {order.shippingAddress.phone}
              </p>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" /> Payment Details
            </h3>
            <div className="text-xs text-gray-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Mode:</span>
                <span className="font-bold text-gray-900">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span
                  className={`font-bold ${order.paymentStatus === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}
                >
                  {order.paymentStatus}
                </span>
              </div>
              {order.paymentReference && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Ref ID:</span>
                  <span className="font-mono text-gray-800 text-[11px] truncate max-w-[120px]">
                    {order.paymentReference}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-gray-100">
                <span className="text-gray-500">Order Placed:</span>
                <span className="font-medium">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-3">
              Order Summary
            </h3>
            <div className="text-xs text-gray-700 space-y-1.5">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="font-semibold">₹{order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Coupon Discount:</span>
                  <span>-₹{order.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery:</span>
                <span className="font-semibold">
                  {order.shippingCharge === 0 ? (
                    <span className="text-emerald-600 font-bold">FREE</span>
                  ) : (
                    `₹${order.shippingCharge}`
                  )}
                </span>
              </div>
              <div className="pt-2 border-t border-dashed border-gray-200 flex justify-between font-bold text-sm text-gray-900">
                <span>Total Amount:</span>
                <span className="text-base">₹{order.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ordered Items Table */}
        <div className="bg-white rounded-lg shadow-xs border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 px-6 border-b border-gray-200 bg-gray-50/50">
            <h3 className="font-bold text-gray-900 text-sm">
              Purchased Items ({order.orderItems.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {order.orderItems.map((item, idx) => (
              <div key={idx} className="p-4 sm:p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-contain rounded bg-gray-50 p-1 border shrink-0"
                  />
                  <div>
                    <Link
                      to={`/product/${item.productId}`}
                      className="font-bold text-sm text-gray-900 hover:text-blue-600 line-clamp-1"
                    >
                      {item.name}
                    </Link>
                    <div className="text-xs text-gray-500 mt-1">
                      Qty: <strong className="text-gray-800">{item.quantity}</strong> × ₹
                      {item.price.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-gray-900">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status History Timeline Audit */}
        <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" /> Order Activity History
          </h3>
          <div className="relative pl-6 border-l-2 border-blue-500 space-y-4">
            {order.statusHistory.map((h, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white"></div>
                <div className="text-xs font-bold text-gray-900">{h.status}</div>
                <div className="text-[11px] text-gray-400">
                  {new Date(h.timestamp).toLocaleString()}
                </div>
                {h.note && <div className="text-xs text-gray-600 mt-0.5">{h.note}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Cancel Modal */}
        {cancelModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl animate-in fade-in">
              <h3 className="font-bold text-lg text-gray-900 mb-2">Cancel Order</h3>
              <p className="text-xs text-gray-500 mb-4">
                Please select the reason for cancelling this order. Your inventory reservation will
                be restored immediately.
              </p>
              <div className="space-y-2 mb-5">
                {[
                  'Found a better price elsewhere',
                  'Ordered by mistake',
                  'Expected delivery time is too long',
                  'Need to change shipping address',
                ].map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      checked={cancelReason === reason}
                      onChange={() => setCancelReason(reason)}
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={actionLoading}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded text-xs font-bold shadow transition cursor-pointer"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
