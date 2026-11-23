import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ShieldCheck, Truck, RotateCcw, Award } from 'lucide-react';
import { useToast } from '../../context/ToastContext.tsx';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const { showToast } = useToast();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    showToast('Subscribed to ShopKart Insider! 15% discount coupon sent to your inbox.', 'success');
    setEmail('');
  };

  return (
    <footer className="bg-[#172337] text-gray-300 text-xs mt-16 border-t border-slate-700">
      {/* Value Badges Banner */}
      <div className="bg-[#0f172a] border-b border-slate-800 py-6 px-4">
        <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <Truck className="w-8 h-8 text-yellow-400 mb-2" />
            <h4 className="font-bold text-white text-sm">Free & Fast Delivery</h4>
            <p className="text-gray-400 text-[11px]">Free delivery on orders above ₹500</p>
          </div>
          <div className="flex flex-col items-center">
            <ShieldCheck className="w-8 h-8 text-yellow-400 mb-2" />
            <h4 className="font-bold text-white text-sm">100% Secure Payments</h4>
            <p className="text-gray-400 text-[11px]">256-bit SSL encrypted checkout</p>
          </div>
          <div className="flex flex-col items-center">
            <Award className="w-8 h-8 text-yellow-400 mb-2" />
            <h4 className="font-bold text-white text-sm">Genuine Products</h4>
            <p className="text-gray-400 text-[11px]">Direct brand authorized warranty</p>
          </div>
          <div className="flex flex-col items-center">
            <RotateCcw className="w-8 h-8 text-yellow-400 mb-2" />
            <h4 className="font-bold text-white text-sm">Hassle-Free Returns</h4>
            <p className="text-gray-400 text-[11px]">7-day easy return and refund policy</p>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* About & Internship Brand info */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-1.5 text-2xl font-black italic text-white">
              Shop<span className="text-yellow-400">Kart</span>
              <span className="bg-yellow-400 text-blue-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded not-italic ml-1">
                INDIA
              </span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
              ShopKart is an academic major project full-stack e-commerce web application inspired
              by Flipkart, Amazon, and Myntra.
            </p>
            <div className="text-[11px] text-gray-400 space-y-1 pt-2 border-t border-slate-700/60">
              <p>
                🏢 <strong>Company:</strong> SIYADNK Software Pvt. Ltd.
              </p>
              <p>
                🎓 <strong>Training Brand:</strong> DNK Media
              </p>
              <p>
                👨‍🏫 <strong>Industry Mentor:</strong> Mr. Amish Verma
              </p>
              <p>
                📍 <strong>Project:</strong> Development of an E-commerce Platform
              </p>
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3 uppercase tracking-wider text-[11px]">
              Categories
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/products?category=Mobiles" className="hover:text-white transition">
                  Mobiles & Tablets
                </Link>
              </li>
              <li>
                <Link to="/products?category=Laptops" className="hover:text-white transition">
                  Laptops & Computers
                </Link>
              </li>
              <li>
                <Link to="/products?category=Electronics" className="hover:text-white transition">
                  Audio & Electronics
                </Link>
              </li>
              <li>
                <Link to="/products?category=Fashion" className="hover:text-white transition">
                  Fashion & Apparel
                </Link>
              </li>
              <li>
                <Link
                  to="/products?category=Home%20%26%20Furniture"
                  className="hover:text-white transition"
                >
                  Home & Furniture
                </Link>
              </li>
              <li>
                <Link
                  to="/products?category=Beauty%20%26%20Personal%20Care"
                  className="hover:text-white transition"
                >
                  Beauty & Personal Care
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3 uppercase tracking-wider text-[11px]">
              Customer Care
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/orders" className="hover:text-white transition">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-white transition">
                  Shipping Rates & Policies
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-white transition">
                  Returns & Replacements
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-white transition">
                  Account Settings
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  className="text-yellow-400 hover:text-yellow-300 font-semibold transition"
                >
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter Subscription */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3 uppercase tracking-wider text-[11px]">
              Stay Updated
            </h4>
            <p className="text-gray-400 text-xs mb-3">
              Subscribe for exclusive member deals, coupon drops, and tech launches.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-gray-500 px-3 py-2 rounded text-xs focus:outline-none focus:border-yellow-400"
              />
              <button
                type="submit"
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-blue-950 font-bold py-2 px-3 rounded text-xs transition cursor-pointer"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-500 text-[11px]">
          <p>
            © 2026 ShopKart Inc. Developed for Summer Internship Project Evaluation. All rights
            reserved.
          </p>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-400">Payment Partners:</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-gray-300 font-mono text-[10px]">
              Razorpay
            </span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-gray-300 font-mono text-[10px]">
              UPI
            </span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-gray-300 font-mono text-[10px]">
              Visa / Master
            </span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-gray-300 font-mono text-[10px]">
              Cash on Delivery
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
