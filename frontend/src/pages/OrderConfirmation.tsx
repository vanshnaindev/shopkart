import React, { useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { CheckCircle2, Package, Truck, ArrowRight, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';

export const OrderConfirmation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const order = location.state?.order;

  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.5 },
    });
  }, []);

  return (
    <div className="min-h-[75vh] bg-[#F1F3F6] py-12 flex items-center justify-center">
      <div className="bg-white rounded-xl p-8 max-w-lg w-full text-center shadow-md border border-gray-100">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 animate-bounce">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
          Thank You! Order Confirmed
        </h1>
        <p className="text-xs text-gray-500 mb-6">
          Your order has been placed and is being prepared for fulfillment.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Order ID:</span>
            <span className="font-bold text-gray-900 font-mono">{order?.orderNumber || id}</span>
          </div>
          {order?.totalAmount && (
            <div className="flex justify-between">
              <span className="text-gray-500">Total Paid:</span>
              <span className="font-bold text-gray-900">
                ₹{order.totalAmount.toLocaleString('en-IN')}
              </span>
            </div>
          )}
          {order?.paymentMethod && (
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Mode:</span>
              <span className="font-semibold text-gray-800">{order.paymentMethod}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="text-gray-500 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-blue-600" /> Estimated Delivery:
            </span>
            <span className="font-bold text-emerald-700">Tomorrow by 11:00 PM</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to={`/order/${id}`}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase py-3 rounded shadow transition flex items-center justify-center gap-1.5"
          >
            <FileText className="w-4 h-4" /> View Invoice & Track
          </Link>
          <Link
            to="/products"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs uppercase py-3 rounded transition flex items-center justify-center gap-1.5"
          >
            Continue Shopping <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
