import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HeroBanner } from '../components/home/HeroBanner.tsx';
import { CategoryBar } from '../components/home/CategoryBar.tsx';
import { DealsSection } from '../components/home/DealsSection.tsx';
import { FeaturedBrands } from '../components/home/FeaturedBrands.tsx';
import { ProductCard } from '../components/products/ProductCard.tsx';
import { api } from '../services/api.ts';
import { IProduct, ICategory } from '../types.ts';
import { Sparkles, ArrowRight, ShieldCheck, CreditCard, Flame } from 'lucide-react';

export const Home: React.FC = () => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        const [catsRes, prodsRes] = await Promise.all([
          api.get('/categories'),
          api.get('/products?limit=24'),
        ]);

        if (catsRes.data.success) {
          setCategories(catsRes.data.categories);
        }
        if (prodsRes.data.success) {
          setProducts(prodsRes.data.products);
        }
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  const bestSellers = products.filter((p) => p.isBestSeller).slice(0, 6);
  const featured = products.filter((p) => p.isFeatured).slice(0, 6);
  const trending = products.slice(0, 12);

  return (
    <div className="min-h-screen bg-[#F1F3F6] pb-12">
      {/* Hero Carousel */}
      <HeroBanner />

      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8 pt-4">
        {/* Categories Strip */}
        <CategoryBar categories={categories} />

        {/* Deals of the Day with Countdown */}
        <DealsSection products={products} />

        {/* Promotional Bank Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 rounded-lg p-4 sm:p-6 mb-8 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <span className="bg-yellow-400 text-blue-950 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                Instant Bank Discount
              </span>
              <h3 className="text-lg sm:text-xl font-bold mt-1">
                Flat 10% Instant Discount on HDFC &amp; SBI Credit Cards
              </h3>
              <p className="text-xs text-blue-100">
                On minimum transaction of ₹4,999. Valid on Electronics, Mobiles &amp; Fashion.
              </p>
            </div>
          </div>
          <Link
            to="/products?category=Electronics"
            className="bg-white hover:bg-yellow-300 text-blue-900 font-bold text-xs uppercase px-5 py-2.5 rounded shadow-sm transition whitespace-nowrap"
          >
            Explore Electronics
          </Link>
        </div>

        {/* Best Sellers Section */}
        {bestSellers.length > 0 && (
          <div className="bg-white rounded-lg shadow-xs border border-gray-100 p-4 sm:p-6 mb-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-6 bg-amber-500 rounded-xs"></span>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  Best Sellers in India
                  <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                </h3>
              </div>
              <Link
                to="/products?bestSeller=true"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {bestSellers.map((prod) => (
                <ProductCard key={prod._id} product={prod} />
              ))}
            </div>
          </div>
        )}

        {/* Featured Brands */}
        <FeaturedBrands />

        {/* Trending & Recommended */}
        <div className="bg-white rounded-lg shadow-xs border border-gray-100 p-4 sm:p-6 mb-8">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 bg-emerald-600 rounded-xs"></span>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Recommended For You
                <Sparkles className="w-4 h-4 text-emerald-500" />
              </h3>
            </div>
            <Link
              to="/products"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Browse All Products <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {trending.map((prod) => (
              <ProductCard key={prod._id} product={prod} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
