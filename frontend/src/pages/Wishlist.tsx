import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext.tsx';
import { useCart } from '../context/CartContext.tsx';

export const Wishlist: React.FC = () => {
  const { products, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();

  if (products.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[#F1F3F6] py-16 flex items-center justify-center">
        <div className="bg-white rounded-lg p-10 max-w-md w-full text-center shadow-xs border border-gray-200">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-10 h-10 fill-rose-500 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Empty Wishlist</h2>
          <p className="text-xs text-gray-500 mb-6">
            You have no items in your wishlist yet. Start saving items you love to shop later!
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-[#2874F0] hover:bg-[#1259c7] text-white font-bold text-xs uppercase px-6 py-3 rounded shadow-md transition"
          >
            Explore Products
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F3F6] py-6">
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-4 flex items-center gap-2">
          My Wishlist
          <span className="text-sm font-normal text-gray-500">
            ({products.length} {products.length === 1 ? 'item' : 'items'})
          </span>
        </h1>

        <div className="bg-white rounded-lg shadow-xs border border-gray-200 divide-y divide-gray-100">
          {products.map((prod) => (
            <div
              key={prod._id}
              className="p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6"
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
              <div className="flex-1 text-center sm:text-left">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {prod.brand} • {prod.category}
                </div>
                <Link
                  to={`/product/${prod._id}`}
                  className="font-bold text-gray-900 text-sm hover:text-blue-600 line-clamp-2 leading-snug mt-0.5"
                >
                  {prod.name}
                </Link>
                <div className="flex items-baseline justify-center sm:justify-start gap-2 mt-2">
                  <span className="text-lg font-bold text-gray-900">
                    ₹{prod.price.toLocaleString('en-IN')}
                  </span>
                  {prod.originalPrice > prod.price && (
                    <span className="text-xs text-gray-400 line-through">
                      ₹{prod.originalPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                  {prod.discount > 0 && (
                    <span className="text-xs text-emerald-600 font-bold">{prod.discount}% off</span>
                  )}
                </div>
                {prod.stock > 0 ? (
                  <span className="text-[11px] text-emerald-600 font-semibold block mt-1">
                    In Stock
                  </span>
                ) : (
                  <span className="text-[11px] text-rose-600 font-semibold block mt-1">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    addToCart(prod, 1);
                    toggleWishlist(prod._id);
                  }}
                  disabled={prod.stock === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white font-bold text-xs px-4 py-2.5 rounded shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Move to Cart
                </button>
                <button
                  onClick={() => toggleWishlist(prod._id)}
                  className="p-2.5 text-gray-400 hover:text-rose-600 transition rounded hover:bg-rose-50 cursor-pointer"
                  title="Remove from Wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
