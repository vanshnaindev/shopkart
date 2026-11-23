import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  Heart,
  ShieldCheck,
  Tag,
  ArrowRight,
  ShoppingBag,
  Plus,
  Minus,
  Check,
} from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import { useWishlist } from '../context/WishlistContext.tsx';
import { api } from '../services/api.ts';
import { ICoupon } from '../types.ts';

export const Cart: React.FC = () => {
  const {
    items,
    itemCount,
    subtotal,
    discount,
    coupon,
    shippingCharge,
    totalAmount,
    updateQuantity,
    removeFromCart,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const { toggleWishlist } = useWishlist();
  const navigate = useNavigate();

  const [couponInput, setCouponInput] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState<ICoupon[]>([]);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const { data } = await api.get('/coupons');
        if (data.success) {
          setAvailableCoupons(data.coupons);
        }
      } catch (err) {
        // ignore
      }
    };
    fetchCoupons();
  }, []);

  const totalMRP = items.reduce((sum, i) => {
    const original = i.product?.originalPrice || i.product?.price || 0;
    return sum + original * i.quantity;
  }, 0);

  const productSavings = Math.max(0, totalMRP - subtotal);
  const totalSavings = productSavings + discount;

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[#F1F3F6] py-16 flex items-center justify-center">
        <div className="bg-white rounded-lg p-10 max-w-md w-full text-center shadow-xs border border-gray-200">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Your Cart is Empty!</h2>
          <p className="text-xs text-gray-500 mb-6">
            Looks like you haven't added anything to your cart yet. Explore our top deals and start
            shopping!
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-[#2874F0] hover:bg-[#1259c7] text-white font-bold text-xs uppercase px-6 py-3 rounded shadow-md transition"
          >
            Shop Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F3F6] py-6">
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-4">
          Shopping Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Cart Items */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-lg shadow-xs border border-gray-200 divide-y divide-gray-100">
              {items.map((item) => {
                const prod = item.product;
                if (!prod) return null;

                return (
                  <div
                    key={item.productId}
                    className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6"
                  >
                    {/* Product Image */}
                    <Link
                      to={`/product/${prod._id}`}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded bg-gray-50 p-2 shrink-0 border border-gray-100 flex items-center justify-center"
                    >
                      <img
                        src={prod.images[0]}
                        alt={prod.name}
                        className="w-full h-full object-contain"
                      />
                    </Link>

                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                          {prod.brand} • {prod.category}
                        </div>
                        <Link
                          to={`/product/${prod._id}`}
                          className="font-bold text-gray-900 text-sm hover:text-blue-600 line-clamp-2 leading-snug mt-0.5"
                        >
                          {prod.name}
                        </Link>
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-lg font-bold text-gray-900">
                            ₹{prod.price.toLocaleString('en-IN')}
                          </span>
                          {prod.originalPrice > prod.price && (
                            <span className="text-xs text-gray-400 line-through">
                              ₹{prod.originalPrice.toLocaleString('en-IN')}
                            </span>
                          )}
                          {prod.discount > 0 && (
                            <span className="text-xs text-emerald-600 font-bold">
                              {prod.discount}% off
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Controls: Stepper, Save for Later, Remove */}
                      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-gray-100">
                        {/* Quantity Stepper */}
                        <div className="flex items-center border border-gray-300 rounded">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-l cursor-pointer"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs font-bold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= prod.stock}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 rounded-r cursor-pointer"
                            title="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Move to Wishlist */}
                        <button
                          onClick={() => {
                            toggleWishlist(prod._id);
                            removeFromCart(item.productId);
                          }}
                          className="text-xs text-gray-600 hover:text-blue-600 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Heart className="w-3.5 h-3.5" /> Save for Later
                        </button>

                        {/* Remove */}
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Guaranteed Trust Banner */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 flex items-center gap-3 text-xs text-gray-600">
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              <span>
                Safe and Secure Payments. 100% Authentic products from brand-verified partners.
              </span>
            </div>
          </div>

          {/* Right Column: Price Summary & Coupon */}
          <div className="lg:col-span-4 space-y-4">
            {/* Coupon Card */}
            <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-500" /> Apply Coupon
              </h3>

              {coupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded p-2.5">
                  <div>
                    <span className="font-bold text-emerald-800 text-xs">
                      {coupon.code} Applied!
                    </span>
                    <span className="block text-[11px] text-emerald-700">
                      Savings: ₹{discount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Coupon (e.g. SHOPKART15)"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="flex-1 text-xs px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600 font-bold uppercase"
                  />
                  <button
                    onClick={() => {
                      applyCoupon(couponInput);
                      setCouponInput('');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded transition cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Available Coupons list */}
              {availableCoupons.length > 0 && !coupon && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-500 block">
                    Available Offers:
                  </span>
                  {availableCoupons.slice(0, 3).map((c) => (
                    <div
                      key={c._id}
                      onClick={() => applyCoupon(c.code)}
                      className="p-2 border border-dashed border-blue-200 rounded hover:bg-blue-50/50 cursor-pointer flex items-center justify-between text-xs transition"
                    >
                      <div>
                        <span className="font-black text-blue-700">{c.code}</span>
                        <span className="text-[10px] text-gray-500 block line-clamp-1">
                          {c.description}
                        </span>
                      </div>
                      <span className="text-blue-600 font-bold text-[11px] hover:underline">
                        Apply
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price Details */}
            <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-5">
              <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs pb-3 border-b border-gray-100">
                Price Details
              </h3>

              <div className="divide-y divide-gray-100 text-xs">
                <div className="py-2.5 flex justify-between text-gray-700">
                  <span>Price ({itemCount} items)</span>
                  <span className="font-semibold">₹{totalMRP.toLocaleString('en-IN')}</span>
                </div>

                {productSavings > 0 && (
                  <div className="py-2.5 flex justify-between text-gray-700">
                    <span>Discount</span>
                    <span className="text-emerald-600 font-bold">
                      -₹{productSavings.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {discount > 0 && (
                  <div className="py-2.5 flex justify-between text-gray-700">
                    <span>Coupon Discount</span>
                    <span className="text-emerald-600 font-bold">
                      -₹{discount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div className="py-2.5 flex justify-between text-gray-700">
                  <span>Delivery Charges</span>
                  <span className="font-semibold">
                    {shippingCharge === 0 ? (
                      <span className="text-emerald-600 font-bold">FREE</span>
                    ) : (
                      `₹${shippingCharge}`
                    )}
                  </span>
                </div>

                <div className="py-3 flex justify-between text-sm font-bold text-gray-900 border-t border-dashed border-gray-300">
                  <span>Total Amount</span>
                  <span className="text-base text-gray-900">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {totalSavings > 0 && (
                <div className="bg-emerald-50 text-emerald-800 text-xs font-bold p-2.5 rounded mt-3 text-center border border-emerald-200">
                  You will save ₹{totalSavings.toLocaleString('en-IN')} on this order!
                </div>
              )}

              {/* Place Order CTA */}
              <button
                onClick={() => navigate('/checkout')}
                className="w-full bg-[#FB641B] hover:bg-[#e0540f] text-white font-bold py-3.5 px-4 rounded text-sm uppercase tracking-wider mt-4 shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                Place Order
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
