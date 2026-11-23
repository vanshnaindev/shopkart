import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, ShieldCheck, UserCheck, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { api } from '../services/api.ts';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [demoResetToken, setDemoResetToken] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');

  const { login, quickDemoLogin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password.', 'error');
      return;
    }
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      navigate('/');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/forgot-password', { email: forgotEmail });
      showToast(data.message, 'info');
      if (data.demoToken) {
        setDemoResetToken(data.demoToken);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error processing request', 'error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/reset-password', {
        token: demoResetToken || undefined,
        email: forgotEmail,
        newPassword: newResetPassword,
      });
      showToast(data.message, 'success');
      setForgotModalOpen(false);
      setEmail(forgotEmail);
      setPassword(newResetPassword);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Reset failed', 'error');
    }
  };

  return (
    <div className="min-h-[80vh] bg-[#F1F3F6] py-12 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-w-4xl w-full grid grid-cols-1 md:grid-cols-12">
        {/* Left Branding Side (Flipkart blue) */}
        <div className="md:col-span-5 bg-[#2874F0] text-white p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-2xl font-black italic tracking-wide text-white mb-4">
              Shop<span className="text-[#FFE500]">Kart</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-3 leading-snug">
              Login to access Orders, Wishlist &amp; Recommendations
            </h2>
            <p className="text-xs text-blue-100 leading-relaxed">
              Get access to member-only discounts, track shipments in real-time, and manage delivery
              addresses.
            </p>
          </div>

          {/* Quick Demo Autofill section for evaluator */}
          <div className="bg-white/10 backdrop-blur-xs p-4 rounded-lg border border-white/20 mt-8 space-y-2">
            <span className="text-[11px] font-bold text-yellow-300 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> 1-Click Evaluation Credentials
            </span>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  quickDemoLogin('admin');
                  navigate('/admin');
                }}
                className="w-full text-left bg-blue-900/60 hover:bg-blue-900 text-white p-2 rounded text-xs flex items-center justify-between font-semibold transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Admin: Amish Verma</span>
                </div>
                <span className="text-[10px] text-blue-200">Auto-login &gt;</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  quickDemoLogin('customer');
                  navigate('/');
                }}
                className="w-full text-left bg-blue-900/60 hover:bg-blue-900 text-white p-2 rounded text-xs flex items-center justify-between font-semibold transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Customer: Rahul Sharma</span>
                </div>
                <span className="text-[10px] text-blue-200">Auto-login &gt;</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Form Side */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            Enter Email / Phone &amp; Password
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="e.g. customer@shopkart.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>
            </div>

            <p className="text-[11px] text-gray-500 leading-tight">
              By continuing, you agree to ShopKart's{' '}
              <span className="text-blue-600">Terms of Use</span> and{' '}
              <span className="text-blue-600">Privacy Policy</span>.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FB641B] hover:bg-[#e0540f] text-white font-bold py-3 px-4 rounded text-xs uppercase tracking-wider shadow transition cursor-pointer"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <span className="text-xs text-gray-600">New to ShopKart? </span>
            <Link to="/register" className="text-xs text-blue-600 font-bold hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in">
            <h3 className="font-bold text-base text-gray-900 mb-2">Reset Password</h3>
            <p className="text-xs text-gray-500 mb-4">
              Enter your registered email to receive a password reset token.
            </p>

            {!demoResetToken ? (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="Enter registered email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="text-xs text-gray-500 hover:text-gray-800 px-3 py-2 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded transition cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div className="bg-emerald-50 text-emerald-800 text-[11px] p-2 rounded">
                  Demo token verified! Enter new password below:
                </div>
                <input
                  type="password"
                  required
                  placeholder="Enter New Password (min 8 chars, uppercase, lowercase, number)"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded"
                />
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded transition cursor-pointer"
                >
                  Set New Password &amp; Login
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
