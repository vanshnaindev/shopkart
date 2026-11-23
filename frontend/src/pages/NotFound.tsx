import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] bg-[#F1F3F6] py-16 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl p-10 max-w-md w-full text-center shadow-xs border border-gray-200">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-2">404</h1>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Page Not Found</h2>
        <p className="text-xs text-gray-500 mb-6">
          The page or product you're looking for doesn't exist or might have been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-[#2874F0] hover:bg-[#1259c7] text-white font-bold text-xs uppercase px-6 py-3 rounded shadow transition"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Homepage
        </Link>
      </div>
    </div>
  );
};
