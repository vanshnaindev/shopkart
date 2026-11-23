import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }
    if (!agreed) {
      showToast('Please accept the terms and conditions.', 'error');
      return;
    }

    setLoading(true);
    const success = await register(name, email, phone, password);
    setLoading(false);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-[85vh] bg-[#F1F3F6] py-12 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-w-4xl w-full grid grid-cols-1 md:grid-cols-12">
        {/* Left Side Branding */}
        <div className="md:col-span-5 bg-[#2874F0] text-white p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-2xl font-black italic tracking-wide text-white mb-4">
              Shop<span className="text-[#FFE500]">Kart</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-3 leading-snug">
              Looks like you're new here!
            </h2>
            <p className="text-xs text-blue-100 leading-relaxed">
              Sign up with your email to start shopping from millions of electronics, fashion, home
              essentials and more.
            </p>
          </div>

          <div className="bg-white/10 p-4 rounded-lg border border-white/20 mt-8 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-yellow-300">
              <ShieldCheck className="w-4 h-4" /> 100% Genuine &amp; Secure
            </div>
            <p className="text-blue-100 text-[11px]">
              Your personal data and passwords are encrypted with industry-standard bcrypt hashing
              and JWT tokens.
            </p>
          </div>
        </div>

        {/* Right Form Side */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Create Your ShopKart Account</h3>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="e.g. name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Re-type password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600 font-medium"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-start gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 text-blue-600 focus:ring-blue-500 rounded"
              />
              <span className="text-[11px] text-gray-600 leading-tight">
                I agree to the{' '}
                <span className="text-blue-600 font-semibold">Terms and Conditions</span> and{' '}
                <span className="text-blue-600 font-semibold">Privacy Policy</span>.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FB641B] hover:bg-[#e0540f] text-white font-bold py-3 px-4 rounded text-xs uppercase tracking-wider shadow transition cursor-pointer"
            >
              {loading ? 'Creating Account...' : 'Continue to Register'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <span className="text-xs text-gray-600">Existing User? </span>
            <Link to="/login" className="text-xs text-blue-600 font-bold hover:underline">
              Log in to your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
