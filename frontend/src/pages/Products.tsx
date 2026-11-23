import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api.ts';
import { IProduct, ICategory } from '../types.ts';
import { ProductCard } from '../components/products/ProductCard.tsx';
import { FilterSidebar } from '../components/products/FilterSidebar.tsx';
import { ArrowUpDown, Filter, PackageOpen, ChevronLeft, ChevronRight } from 'lucide-react';

export const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Extract query filters from URL
  const categoryParam = searchParams.get('category') || 'All';
  const brandParam = searchParams.get('brand') || 'All';
  const searchParam = searchParams.get('search') || '';
  const minPriceParam = searchParams.get('minPrice') || '';
  const maxPriceParam = searchParams.get('maxPrice') || '';
  const minRatingParam = searchParams.get('minRating') || '';
  const sortParam = searchParams.get('sort') || 'popularity';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const dealsParam = searchParams.get('deals') === 'true';
  const bestSellerParam = searchParams.get('bestSeller') === 'true';

  // Load categories once
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await api.get('/categories');
        if (data.success) {
          setCategories(data.categories);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products whenever filters or pagination change
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const params: any = {
          page: pageParam,
          limit: 12,
          sort: sortParam,
        };

        if (categoryParam && categoryParam !== 'All') params.category = categoryParam;
        if (brandParam && brandParam !== 'All') params.brand = brandParam;
        if (searchParam) params.search = searchParam;
        if (minPriceParam) params.minPrice = minPriceParam;
        if (maxPriceParam) params.maxPrice = maxPriceParam;
        if (minRatingParam && minRatingParam !== 'All') params.minRating = minRatingParam;
        if (dealsParam) params.deals = 'true';
        if (bestSellerParam) params.bestSeller = 'true';

        const { data } = await api.get('/products', { params });
        if (data.success) {
          setProducts(data.products);
          setTotal(data.total);
          setTotalPages(data.totalPages);
          if (data.brands) setBrands(data.brands);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [
    categoryParam,
    brandParam,
    searchParam,
    minPriceParam,
    maxPriceParam,
    minRatingParam,
    sortParam,
    pageParam,
    dealsParam,
    bestSellerParam,
  ]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'All') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.set('page', '1'); // Reset to page 1 on filter
    setSearchParams(next);
  };

  const handlePriceChange = (min: string, max: string) => {
    const next = new URLSearchParams(searchParams);
    if (min) next.set('minPrice', min);
    else next.delete('minPrice');

    if (max) next.set('maxPrice', max);
    else next.delete('maxPrice');

    next.set('page', '1');
    setSearchParams(next);
  };

  const handleResetFilters = () => {
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-[#F1F3F6] py-6">
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">
              Home &gt; Products {categoryParam !== 'All' ? `> ${categoryParam}` : ''}
              {searchParam ? ` > Search: "${searchParam}"` : ''}
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              {searchParam
                ? `Results for "${searchParam}"`
                : categoryParam !== 'All'
                  ? categoryParam
                  : dealsParam
                    ? "Today's Deals"
                    : 'All Products'}
              <span className="text-sm font-normal text-gray-500">
                ({total.toLocaleString()} products)
              </span>
            </h1>
          </div>

          {/* Sort Dropdown & Mobile Filter Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="md:hidden flex items-center gap-1.5 bg-white border border-gray-300 text-gray-800 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer"
            >
              <Filter className="w-4 h-4 text-blue-600" />
              Filters
            </button>

            <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-sm shadow-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs text-gray-500 font-medium">Sort By:</span>
              <select
                value={sortParam}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="text-xs font-semibold text-gray-900 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="popularity">Popularity</option>
                <option value="price-low-high">Price -- Low to High</option>
                <option value="price-high-low">Price -- High to Low</option>
                <option value="rating">Customer Rating</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {/* Sidebar */}
          <div className={`md:block ${mobileFilterOpen ? 'block' : 'hidden'}`}>
            <FilterSidebar
              categories={categories}
              selectedCategory={categoryParam}
              onSelectCategory={(cat) => updateParam('category', cat)}
              brands={brands}
              selectedBrand={brandParam}
              onSelectBrand={(b) => updateParam('brand', b)}
              minPrice={minPriceParam}
              maxPrice={maxPriceParam}
              onPriceChange={handlePriceChange}
              minRating={minRatingParam}
              onSelectRating={(r) => updateParam('minRating', r)}
              onResetFilters={handleResetFilters}
            />
          </div>

          {/* Product Grid */}
          <div className="md:col-span-3 lg:col-span-4">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 animate-pulse space-y-3">
                    <div className="aspect-square bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center border border-gray-200 shadow-xs">
                <PackageOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-800 mb-1">No Products Found</h3>
                <p className="text-xs text-gray-500 mb-6 max-w-sm mx-auto">
                  We couldn't find any products matching your current filters. Try relaxing your
                  search or resetting filters.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-2.5 rounded shadow-sm transition cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {products.map((p) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      onClick={() => updateParam('page', String(pageParam - 1))}
                      disabled={pageParam <= 1}
                      className="p-2 rounded bg-white border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    {[...Array(totalPages)].map((_, idx) => {
                      const pNum = idx + 1;
                      return (
                        <button
                          key={pNum}
                          onClick={() => updateParam('page', String(pNum))}
                          className={`w-9 h-9 rounded font-bold text-xs transition cursor-pointer ${
                            pageParam === pNum
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => updateParam('page', String(pageParam + 1))}
                      disabled={pageParam >= totalPages}
                      className="p-2 rounded bg-white border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-700" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
