import React from 'react';
import { Star, RotateCcw } from 'lucide-react';
import { ICategory } from '../../types.ts';

interface FilterSidebarProps {
  categories: ICategory[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  brands: string[];
  selectedBrand: string;
  onSelectBrand: (brand: string) => void;
  minPrice: string;
  maxPrice: string;
  onPriceChange: (min: string, max: string) => void;
  minRating: string;
  onSelectRating: (rating: string) => void;
  onResetFilters: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  brands,
  selectedBrand,
  onSelectBrand,
  minPrice,
  maxPrice,
  onPriceChange,
  minRating,
  onSelectRating,
  onResetFilters,
}) => {
  return (
    <aside className="bg-white rounded-lg shadow-xs border border-gray-200 p-4 space-y-6">
      {/* Title & Clear All */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-base uppercase tracking-wider text-xs">
          Filters
        </h3>
        <button
          onClick={onResetFilters}
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          Clear All
        </button>
      </div>

      {/* Categories */}
      <div>
        <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-2.5">
          Category
        </h4>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          <label className="flex items-center gap-2 text-xs text-gray-700 hover:text-blue-600 cursor-pointer">
            <input
              type="radio"
              name="category"
              checked={!selectedCategory || selectedCategory === 'All'}
              onChange={() => onSelectCategory('All')}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium">All Categories</span>
          </label>
          {categories.map((c) => (
            <label
              key={c._id}
              className="flex items-center justify-between text-xs text-gray-700 hover:text-blue-600 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="category"
                  checked={selectedCategory === c.name}
                  onChange={() => onSelectCategory(c.name)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className={selectedCategory === c.name ? 'font-bold text-blue-600' : ''}>
                  {c.name}
                </span>
              </div>
              {c.itemCount !== undefined && (
                <span className="text-[10px] text-gray-400">({c.itemCount})</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-2.5">
          Price (₹)
        </h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => onPriceChange(e.target.value, maxPrice)}
            className="w-full text-xs p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => onPriceChange(minPrice, e.target.value)}
            className="w-full text-xs p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <button
            type="button"
            onClick={() => onPriceChange('', '1000')}
            className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded cursor-pointer"
          >
            Under ₹1K
          </button>
          <button
            type="button"
            onClick={() => onPriceChange('1000', '10000')}
            className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded cursor-pointer"
          >
            ₹1K - ₹10K
          </button>
          <button
            type="button"
            onClick={() => onPriceChange('10000', '50000')}
            className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded cursor-pointer"
          >
            ₹10K - ₹50K
          </button>
          <button
            type="button"
            onClick={() => onPriceChange('50000', '')}
            className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded cursor-pointer"
          >
            ₹50K+
          </button>
        </div>
      </div>

      {/* Brands */}
      {brands.length > 0 && (
        <div>
          <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-2.5">Brand</h4>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            <label className="flex items-center gap-2 text-xs text-gray-700 hover:text-blue-600 cursor-pointer">
              <input
                type="radio"
                name="brand"
                checked={!selectedBrand || selectedBrand === 'All'}
                onChange={() => onSelectBrand('All')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>All Brands</span>
            </label>
            {brands.map((b) => (
              <label
                key={b}
                className="flex items-center gap-2 text-xs text-gray-700 hover:text-blue-600 cursor-pointer"
              >
                <input
                  type="radio"
                  name="brand"
                  checked={selectedBrand === b}
                  onChange={() => onSelectBrand(b)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className={selectedBrand === b ? 'font-bold text-blue-600' : ''}>{b}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Customer Ratings */}
      <div>
        <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-2.5">
          Customer Rating
        </h4>
        <div className="space-y-1.5">
          {[4, 3, 2].map((stars) => (
            <label
              key={stars}
              className="flex items-center gap-2 text-xs text-gray-700 hover:text-blue-600 cursor-pointer"
            >
              <input
                type="radio"
                name="rating"
                checked={minRating === String(stars)}
                onChange={() => onSelectRating(String(stars))}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="flex items-center gap-1">{stars}★ & above</span>
            </label>
          ))}
          <label className="flex items-center gap-2 text-xs text-gray-700 hover:text-blue-600 cursor-pointer">
            <input
              type="radio"
              name="rating"
              checked={!minRating || minRating === 'All'}
              onChange={() => onSelectRating('All')}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span>All Ratings</span>
          </label>
        </div>
      </div>
    </aside>
  );
};
