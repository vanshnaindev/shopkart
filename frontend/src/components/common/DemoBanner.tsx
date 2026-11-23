import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { api } from '../../services/api.ts';
import { ShieldCheck, UserCheck, RotateCcw, X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DemoBanner: React.FC = () => {
  const { user, quickDemoLogin, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [closed, setClosed] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (closed) return null;

  const handleReset = async () => {
    if (
      !window.confirm(
        'Reset database to pristine seed data (30+ products, sample orders, reviews)?'
      )
    )
      return;
    try {
      setResetting(true);
      const { data } = await api.post('/seed/reset');
      showToast(data.message || 'Database reset successfully!', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      showToast('Reset failed', 'error');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white text-xs py-2 px-4 border-b border-slate-800">
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" /> Demo Evaluator Bar
          </span>
          <span className="hidden md:inline text-slate-300">
            Active:{' '}
            <strong className="text-white">
              {user ? `${user.name} (${user.role.toUpperCase()})` : 'Guest Visitor'}
            </strong>
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {!user || user.role !== 'admin' ? (
            <button
              onClick={() => {
                quickDemoLogin('admin');
                navigate('/admin');
              }}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded font-medium transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
              1-Click Admin Login
            </button>
          ) : (
            <button
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded font-medium transition cursor-pointer"
            >
              Open Admin Dashboard
            </button>
          )}

          {(!user || user.role !== 'customer') && (
            <button
              onClick={() => quickDemoLogin('customer')}
              className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white px-2.5 py-1 rounded font-medium transition cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-slate-300" />
              1-Click Customer Login
            </button>
          )}

          {user && (
            <button
              onClick={logout}
              className="text-slate-400 hover:text-white px-2 py-1 text-xs underline cursor-pointer"
            >
              Switch / Logout
            </button>
          )}

          <button
            onClick={handleReset}
            disabled={resetting}
            title="Reset database to pristine seed catalog"
            className="inline-flex items-center gap-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50 px-2.5 py-1 rounded font-medium transition cursor-pointer ml-1"
          >
            <RotateCcw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
            {resetting ? 'Resetting...' : 'Reset Demo DB'}
          </button>

          <button
            onClick={() => setClosed(true)}
            className="text-slate-400 hover:text-white p-1 ml-1"
            title="Dismiss top bar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
