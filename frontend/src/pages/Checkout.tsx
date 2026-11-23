import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  CheckCircle2,
  MapPin,
  CreditCard,
  Banknote,
  Truck,
  Plus,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { api } from '../services/api.ts';
import { IUserAddress } from '../types.ts';

export const Checkout: React.FC = () => {
  const { items, subtotal, discount, coupon, shippingCharge, totalAmount, clearCart } = useCart();
  const { user, addAddress } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Steps: 1: Address, 2: Payment, 3: Review
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Address selection
  const userAddresses = user?.addresses || [];
  const [selectedAddressId, setSelectedAddressId] = useState<string>(userAddresses[0]?.id || '');
  const [showNewAddressForm, setShowNewAddressForm] = useState<boolean>(userAddresses.length === 0);

  // New Address state
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('Bangalore');
  const [state, setState] = useState('Karnataka');
  const [pincode, setPincode] = useState('560038');
  const [addressType, setAddressType] = useState<'home' | 'work'>('home');

  // Payment Selection: 'COD' | 'Razorpay'
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'Razorpay'>('COD');
  const [placingOrder, setPlacingOrder] = useState<boolean>(false);

  // If not logged in, prompt to login or register
  if (!user) {
    return (
      <div className="min-h-[70vh] bg-[#F1F3F6] py-16 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-xs border border-gray-200 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Please Login to Checkout</h2>
          <p className="text-xs text-gray-500 mb-6">
            To proceed with your order, secure your delivery address and receive status tracking,
            please log in or register.
          </p>
          <div className="space-y-3">
            <Link
              to="/login"
              className="block w-full bg-[#2874F0] hover:bg-[#1259c7] text-white font-bold py-3 rounded text-xs uppercase shadow transition"
            >
              Login to Continue
            </Link>
            <Link
              to="/register"
              className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2.5 rounded text-xs transition"
            >
              New Customer? Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] bg-[#F1F3F6] py-16 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md w-full text-center shadow-xs border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-xs text-gray-500 mb-4">
            Please add items to your cart before proceeding to checkout.
          </p>
          <Link to="/products" className="text-blue-600 font-bold text-xs underline">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  const selectedAddress: IUserAddress | undefined =
    userAddresses.find((a) => a.id === selectedAddressId) ||
    (userAddresses.length > 0 ? userAddresses[0] : undefined);

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !street || !city || !state || !pincode) {
      showToast('Please fill out all required address fields.', 'error');
      return;
    }

    const ok = await addAddress({
      fullName,
      phone,
      street,
      city,
      state,
      pincode,
      type: addressType,
      isDefault: true,
    });

    if (ok) {
      setShowNewAddressForm(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress && !showNewAddressForm) {
      showToast('Please select or add a delivery address.', 'error');
      setCurrentStep(1);
      return;
    }

    const deliveryAddress = selectedAddress || {
      id: 'addr_temp',
      fullName,
      phone,
      street,
      city,
      state,
      pincode,
      type: addressType,
    };

    setPlacingOrder(true);

    try {
      // Step 1: Place Order in Database
      const { data } = await api.post('/orders', {
        items: items.map((i) => ({
          productId: i.productId,
          name: i.product?.name,
          quantity: i.quantity,
        })),
        shippingAddress: deliveryAddress,
        paymentMethod,
        couponCode: coupon?.code,
      });

      if (!data.success || !data.order) {
        throw new Error(data.message || 'Failed to place order');
      }

      let confirmedOrder = data.order;

      // Step 2: Handle Razorpay payment verification if selected
      if (paymentMethod === 'Razorpay') {
        const orderRes = await api.post('/payments/create-order', {
          amount: confirmedOrder.totalAmount,
          currency: 'INR',
          receipt: confirmedOrder.orderNumber,
        });

        const { orderId, isDemoMode } = orderRes.data;
        const paymentId =
          'pay_' + (isDemoMode ? 'sandbox_' : 'live_') + Math.random().toString(36).substring(2, 9);

        // Verify payment and mark order Paid
        const verifyRes = await api.post('/payments/verify', {
          orderId: confirmedOrder._id,
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: 'demo_valid_signature_token',
        });

        if (verifyRes.data.success && verifyRes.data.order) {
          confirmedOrder = verifyRes.data.order;
        }
      }

      // Celebrate with confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      showToast('🎉 Order placed successfully!', 'success');
      await clearCart();
      navigate(`/order-confirmation/${confirmedOrder._id}`, { state: { order: confirmedOrder } });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to place order';
      showToast(msg, 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F3F6] py-6">
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8">
        {/* Progress Tracker */}
        <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between max-w-2xl mx-auto text-xs font-bold">
            <div
              className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                1
              </span>
              <span>Delivery Address</span>
            </div>
            <div className="h-0.5 w-12 bg-gray-200"></div>
            <div
              className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                2
              </span>
              <span>Payment Option</span>
            </div>
            <div className="h-0.5 w-12 bg-gray-200"></div>
            <div
              className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                3
              </span>
              <span>Order Review</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Multi-Step Forms */}
          <div className="lg:col-span-8 space-y-4">
            {/* Step 1: Delivery Address */}
            <div className="bg-white rounded-lg shadow-xs border border-gray-200 overflow-hidden">
              <div className="bg-[#2874F0] text-white p-3.5 px-5 flex items-center justify-between font-bold text-sm">
                <div className="flex items-center gap-2">
                  <span className="bg-white text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>DELIVERY ADDRESS</span>
                </div>
                {selectedAddress && currentStep > 1 && (
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded cursor-pointer"
                  >
                    Change
                  </button>
                )}
              </div>

              {currentStep === 1 ? (
                <div className="p-5 space-y-4">
                  {userAddresses.length > 0 && !showNewAddressForm && (
                    <div className="space-y-3">
                      {userAddresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition ${
                            selectedAddressId === addr.id || (!selectedAddressId && addr.isDefault)
                              ? 'border-blue-600 bg-blue-50/40'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="deliveryAddress"
                            checked={
                              selectedAddressId === addr.id ||
                              (!selectedAddressId && addr.isDefault)
                            }
                            onChange={() => setSelectedAddressId(addr.id)}
                            className="mt-1 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-900 text-sm">
                                {addr.fullName}
                              </span>
                              <span className="bg-gray-100 text-gray-600 uppercase text-[10px] font-bold px-1.5 py-0.5 rounded">
                                {addr.type}
                              </span>
                              <span className="text-gray-500 font-semibold">{addr.phone}</span>
                            </div>
                            <p className="text-gray-600">
                              {addr.street}, {addr.city}, {addr.state} -{' '}
                              <strong className="text-gray-900">{addr.pincode}</strong>
                            </p>
                          </div>
                        </label>
                      ))}

                      <button
                        type="button"
                        onClick={() => setShowNewAddressForm(true)}
                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold text-xs p-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Add a New Delivery Address
                      </button>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="bg-[#FB641B] hover:bg-[#e0540f] text-white font-bold text-xs uppercase px-8 py-3 rounded shadow transition cursor-pointer"
                        >
                          Deliver Here &amp; Continue
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Add New Address Form */}
                  {(showNewAddressForm || userAddresses.length === 0) && (
                    <form onSubmit={handleSaveNewAddress} className="space-y-3">
                      <div className="text-xs font-bold text-gray-700 uppercase mb-2">
                        Add New Delivery Address
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-gray-600 block mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full text-xs p-2.5 border border-gray-300 rounded focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-gray-600 block mb-1">
                            10-Digit Mobile Phone *
                          </label>
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full text-xs p-2.5 border border-gray-300 rounded focus:border-blue-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-600 block mb-1">
                          Street, Flat, House No., Building, Apartment *
                        </label>
                        <input
                          type="text"
                          required
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          className="w-full text-xs p-2.5 border border-gray-300 rounded focus:border-blue-600"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-gray-600 block mb-1">
                            City / District *
                          </label>
                          <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full text-xs p-2.5 border border-gray-300 rounded focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-gray-600 block mb-1">
                            State *
                          </label>
                          <input
                            type="text"
                            required
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="w-full text-xs p-2.5 border border-gray-300 rounded focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-gray-600 block mb-1">
                            PIN Code *
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            required
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value)}
                            className="w-full text-xs p-2.5 border border-gray-300 rounded focus:border-blue-600"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pt-1">
                        <span className="text-xs font-bold text-gray-600">Address Type:</span>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="addrType"
                            checked={addressType === 'home'}
                            onChange={() => setAddressType('home')}
                          />
                          Home (All day delivery)
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="addrType"
                            checked={addressType === 'work'}
                            onChange={() => setAddressType('work')}
                          />
                          Work (Delivery between 10 AM - 5 PM)
                        </label>
                      </div>

                      <div className="flex items-center gap-3 pt-3">
                        <button
                          type="submit"
                          className="bg-[#FB641B] hover:bg-[#e0540f] text-white font-bold text-xs uppercase px-6 py-2.5 rounded shadow cursor-pointer"
                        >
                          Save &amp; Deliver Here
                        </button>
                        {userAddresses.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowNewAddressForm(false)}
                            className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                selectedAddress && (
                  <div className="p-4 px-5 text-xs text-gray-700 bg-gray-50/50">
                    <span className="font-bold text-gray-900">{selectedAddress.fullName}</span> (
                    {selectedAddress.phone}) — {selectedAddress.street}, {selectedAddress.city},{' '}
                    {selectedAddress.state} - {selectedAddress.pincode}
                  </div>
                )
              )}
            </div>

            {/* Step 2: Payment Method */}
            <div className="bg-white rounded-lg shadow-xs border border-gray-200 overflow-hidden">
              <div className="bg-[#2874F0] text-white p-3.5 px-5 flex items-center justify-between font-bold text-sm">
                <div className="flex items-center gap-2">
                  <span className="bg-white text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>PAYMENT OPTIONS</span>
                </div>
                {currentStep > 2 && (
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded cursor-pointer"
                  >
                    Change
                  </button>
                )}
              </div>

              {currentStep === 2 && (
                <div className="p-5 space-y-4">
                  {/* Option 1: Cash on Delivery */}
                  <label
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition ${
                      paymentMethod === 'COD' ? 'border-blue-600 bg-blue-50/40' : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentOption"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-emerald-600" />
                        <span className="font-bold text-sm text-gray-900">
                          Cash on Delivery (COD)
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Pay cash or scan UPI QR with courier agent at the time of delivery at your
                        doorstep.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Razorpay Online Payment */}
                  <label
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition ${
                      paymentMethod === 'Razorpay'
                        ? 'border-blue-600 bg-blue-50/40'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentOption"
                      checked={paymentMethod === 'Razorpay'}
                      onChange={() => setPaymentMethod('Razorpay')}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                          <span className="font-bold text-sm text-gray-900">
                            Razorpay Secure (Cards, UPI, Netbanking)
                          </span>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded">
                          Instant Verification
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Supports GPay, PhonePe, Paytm, RuPay, Visa, Mastercard and all Indian banks.
                      </p>
                      <div className="mt-2 bg-amber-50 text-amber-800 text-[11px] p-2 rounded border border-amber-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>
                          Academic / Sandbox mode configured. Signature verified securely on
                          backend.
                        </span>
                      </div>
                    </div>
                  </label>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="bg-[#FB641B] hover:bg-[#e0540f] text-white font-bold text-xs uppercase px-8 py-3 rounded shadow transition cursor-pointer"
                    >
                      Continue to Order Review
                    </button>
                  </div>
                </div>
              )}

              {currentStep > 2 && (
                <div className="p-4 px-5 text-xs text-gray-700 bg-gray-50/50 flex items-center justify-between">
                  <span>
                    Selected Payment:{' '}
                    <strong className="text-gray-900">
                      {paymentMethod === 'COD' ? 'Cash on Delivery' : 'Razorpay Secure'}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Step 3: Order Review */}
            {currentStep === 3 && (
              <div className="bg-white rounded-lg shadow-xs border border-gray-200 overflow-hidden">
                <div className="bg-[#2874F0] text-white p-3.5 px-5 flex items-center gap-2 font-bold text-sm">
                  <span className="bg-white text-blue-600 w-5 h-5 rounded-full flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>ORDER REVIEW &amp; CONFIRMATION</span>
                </div>

                <div className="p-5 space-y-4">
                  {/* Delivery Timeline banner */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <span className="font-bold">
                        Guaranteed Express Delivery: Tomorrow by 11:00 PM
                      </span>
                      <p className="text-blue-700 text-[11px]">
                        Dispatching via BlueDart from Bangalore hub
                      </p>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <div key={item.productId} className="py-3 flex items-center gap-4 text-xs">
                        <img
                          src={item.product?.images[0]}
                          alt=""
                          className="w-12 h-12 object-contain rounded border p-1"
                        />
                        <div className="flex-1">
                          <span className="font-bold text-gray-900 line-clamp-1">
                            {item.product?.name}
                          </span>
                          <span className="text-gray-500">Qty: {item.quantity}</span>
                        </div>
                        <span className="font-bold text-gray-900 text-sm">
                          ₹{((item.product?.price || 0) * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Confirmation CTA */}
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Order confirmation email will be sent to <strong>{user.email}</strong>
                    </div>

                    <button
                      type="button"
                      onClick={handlePlaceOrder}
                      disabled={placingOrder}
                      className="bg-[#FB641B] hover:bg-[#e0540f] disabled:bg-gray-300 text-white font-black text-sm uppercase px-10 py-3.5 rounded shadow-lg transition flex items-center gap-2 cursor-pointer"
                    >
                      {placingOrder ? 'Processing...' : 'CONFIRM ORDER'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Price Breakdown */}
          <div className="lg:col-span-4 bg-white rounded-lg shadow-xs border border-gray-200 p-5 space-y-4">
            <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs pb-3 border-b border-gray-100">
              Price Details
            </h3>

            <div className="space-y-2.5 text-xs text-gray-700">
              <div className="flex justify-between">
                <span>Subtotal ({items.length} items)</span>
                <span className="font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Coupon Savings</span>
                  <span>-₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span className="font-semibold">
                  {shippingCharge === 0 ? (
                    <span className="text-emerald-600 font-bold">FREE</span>
                  ) : (
                    `₹${shippingCharge}`
                  )}
                </span>
              </div>
              <div className="pt-3 border-t border-dashed border-gray-300 flex justify-between text-sm font-bold text-gray-900">
                <span>Total Payable</span>
                <span className="text-base text-gray-900">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded text-center font-bold">
              🛡️ Safe and Secure Checkout Experience
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
