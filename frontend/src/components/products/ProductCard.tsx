import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, ShoppingCart, Check } from 'lucide-react';
import { IProduct } from '../../types.ts';
import { useCart } from '../../context/CartContext.tsx';
import { useWishlist } from '../../context/WishlistContext.tsx';

interface ProductCardProps {
  product: IProduct;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, items } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const isFavorited = isInWishlist(product._id);
  const inCart = items.some((i) => i.productId === product._id);
  const isOutOfStock = product.stock === 0;

  return (
    <div className="group relative bg-white border border-gray-100 hover:border-gray-300 rounded-lg overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col h-full">
      {/* Top Badges */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
        {product.isBestSeller && (
          <span className="bg-[#FF9F00] text-white text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded shadow-xs">
            Best Seller
          </span>
        )}
        {product.isDealOfDay && (
          <span className="bg-rose-600 text-white text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded shadow-xs animate-pulse">
            Deal of the Day
          </span>
        )}
        {product.discount > 0 && !product.isBestSeller && !product.isDealOfDay && (
          <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {product.discount}% OFF
          </span>
        )}
      </div>

      {/* Wishlist Heart Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleWishlist(product._id);
        }}
        className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center transition cursor-pointer"
        title={isFavorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
      >
        <Heart
          className={`w-4 h-4 transition-colors ${
            isFavorited ? 'fill-rose-500 text-rose-500' : 'text-gray-400 hover:text-rose-500'
          }`}
        />
      </button>

      {/* Product Image Link */}
      <Link
        to={`/product/${product._id}`}
        className="block relative aspect-square p-4 bg-gray-50/50 overflow-hidden flex items-center justify-center"
      >
        <img
          src={
            product.images[0] ||
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'
          }
          alt={product.name}
          className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div>
          {/* Brand & Category */}
          <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="truncate">{product.brand}</span>
            <span className="text-gray-400 text-[10px] truncate">{product.category}</span>
          </div>

          {/* Title */}
          <Link
            to={`/product/${product._id}`}
            className="font-semibold text-gray-900 text-sm hover:text-blue-600 transition-colors line-clamp-2 leading-snug"
            title={product.name}
          >
            {product.name}
          </Link>

          {/* Rating Badge */}
          <div className="flex items-center gap-2 mt-2">
            <div className="inline-flex items-center gap-1 bg-[#388E3C] text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
              <span>{product.averageRating || 4.5}</span>
              <Star className="w-3 h-3 fill-white" />
            </div>
            <span className="text-gray-500 text-xs">({product.numReviews.toLocaleString()})</span>
          </div>
        </div>

        {/* Pricing & Cart Action */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 mt-auto">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-bold text-gray-900">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-xs text-gray-400 line-through">
                  ₹{product.originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            {product.discount > 0 && (
              <span className="text-[11px] text-emerald-600 font-bold block">
                {product.discount}% off
              </span>
            )}
          </div>

          <button
            onClick={() => addToCart(product, 1)}
            disabled={isOutOfStock}
            className={`p-2 rounded-md transition font-medium flex items-center justify-center shrink-0 cursor-pointer ${
              isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : inCart
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
            }`}
            title={inCart ? 'Already in cart (+1)' : 'Add to cart'}
          >
            {inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
