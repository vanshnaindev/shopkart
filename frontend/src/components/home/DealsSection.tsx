import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Timer, ArrowRight, Sparkles } from 'lucide-react';
import { IProduct } from '../../types.ts';
import { ProductCard } from '../products/ProductCard.tsx';

interface DealsSectionProps {
  products: IProduct[];
}

export const DealsSection: React.FC<DealsSectionProps> = ({ products }) => {
  // Countdown timer for Deals of the day
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 35, seconds: 48 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (val: number) => String(val).padStart(2, '0');

  const dealProducts = products.filter((p) => p.isDealOfDay || p.discount >= 20).slice(0, 6);

  return (
    <div className="bg-white rounded-lg shadow-xs border border-gray-100 p-4 sm:p-6 mb-8">
      {/* Header with Countdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-blue-600 rounded-xs"></span>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              Today's Best Deals
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h3>
          </div>

          {/* Timer Pills */}
          <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-bold border border-rose-200">
            <Timer className="w-3.5 h-3.5 text-rose-600" />
            <span>
              Ends in {formatTime(timeLeft.hours)}h : {formatTime(timeLeft.minutes)}m :{' '}
              {formatTime(timeLeft.seconds)}s
            </span>
          </div>
        </div>

        <Link
          to="/products?deals=true"
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase px-4 py-2 rounded shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          View All Deals
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {dealProducts.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
};
