import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { ShieldCheck, UserCheck, X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DemoBanner: React.FC = () => {
  const { user, quickDemoLogin, logout } = useAuth();
  const navigate = useNavigate();
  const [closed, setClosed] = useState(false);

  if (closed) return null;

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
