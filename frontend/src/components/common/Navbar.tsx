import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  ShieldCheck,
  Package,
  LogOut,
  ChevronDown,
  Menu,
  X,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useCart } from '../../context/CartContext.tsx';
import { useWishlist } from '../../context/WishlistContext.tsx';
import { api } from '../../services/api.ts';
import { IProduct, ICategory } from '../../types.ts';

export const Navbar: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const { productIds } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<IProduct[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pincode, setPincode] = useState('560038');
  const [pincodeModalOpen, setPincodeModalOpen] = useState(false);
  const [newPincode, setNewPincode] = useState('');

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch categories for category strip
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const { data } = await api.get('/categories');
        if (data.success && data.categories) {
          setCategories(data.categories);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCats();
  }, []);

  // Live search suggestions debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(
          `/products?search=${encodeURIComponent(searchQuery)}&limit=6`
        );
        if (data.success && data.products) {
          setSuggestions(data.products);
          setShowSuggestions(true);
        }
      } catch (err) {
        // ignore
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close search and user dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectSuggestion = (prod: IProduct) => {
    setShowSuggestions(false);
    setSearchQuery('');
    navigate(`/product/${prod._id}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#2874F0] text-white shadow-md">
      {/* Main Navbar */}
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8 py-2.5">
        <div className="flex items-center justify-between gap-4 md:gap-8">
          {/* Logo & Pin Code */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-1 hover:bg-blue-600 rounded"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <Link to="/" className="flex flex-col group">
              <div className="flex items-center gap-1">
                <span className="text-2xl font-black italic tracking-wider text-white">
                  Shop<span className="text-[#FFE500]">Kart</span>
                </span>
                <span className="bg-[#FFE500] text-blue-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded italic">
                  PLUS
                </span>
              </div>
              <span className="text-[9.5px] italic text-blue-100 font-medium tracking-tight -mt-1 group-hover:text-yellow-200 transition-colors">
                Explore <span className="text-[#FFE500] font-bold">Plus</span> ✦
              </span>
            </Link>

            {/* Delivery Location button */}
            <button
              onClick={() => setPincodeModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 text-left text-xs text-blue-100 hover:text-white px-2 py-1 rounded hover:bg-blue-600/50 transition cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-yellow-300 shrink-0" />
              <div>
                <div className="text-[10px] text-blue-200 leading-tight">Deliver to</div>
                <div className="font-bold text-white text-xs leading-tight">PIN {pincode}</div>
              </div>
            </button>
          </div>

          {/* Search Bar with Autocomplete Dropdown */}
          <div ref={searchContainerRef} className="flex-1 max-w-3xl lg:max-w-4xl relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search for products, brands and more..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className="w-full bg-white text-gray-900 placeholder-gray-400 text-sm pl-4 pr-10 py-2.5 rounded-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-medium"
              />
              <button
                type="submit"
                className="absolute right-0 top-0 bottom-0 px-3.5 text-blue-600 hover:text-blue-800 transition flex items-center justify-center cursor-pointer"
              >
                <Search className="w-5 h-5" />
              </button>
            </form>

            {/* Suggestions Overlay */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white text-gray-900 rounded-md shadow-2xl border border-gray-200 overflow-hidden z-50">
                <div className="p-2 text-xs font-semibold text-gray-500 bg-gray-50 uppercase tracking-wider flex items-center justify-between">
                  <span>Product Suggestions</span>
                  <span className="text-[10px] lowercase text-gray-400">
                    {suggestions.length} found
                  </span>
                </div>
                <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                  {suggestions.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => handleSelectSuggestion(item)}
                      className="p-3 flex items-center gap-3 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <img
                        src={item.images[0]}
                        alt={item.name}
                        className="w-10 h-10 object-cover rounded shrink-0 border border-gray-100"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span className="font-medium text-blue-600">in {item.category}</span>
                          <span>•</span>
                          <span className="font-bold text-gray-900">
                            ₹{item.price.toLocaleString()}
                          </span>
                          {item.discount > 0 && (
                            <span className="text-emerald-600 font-semibold">
                              {item.discount}% off
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* User / Account Button */}
            <div ref={dropdownRef} className="relative">
              {user ? (
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 bg-white text-blue-600 hover:bg-blue-50 px-3.5 py-1.5 rounded-sm font-bold text-sm shadow-sm transition cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span className="max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 bg-white text-blue-600 hover:bg-blue-50 px-4 py-1.5 rounded-sm font-bold text-sm shadow-sm transition"
                >
                  <User className="w-4 h-4" />
                  <span>Login</span>
                </Link>
              )}

              {/* User Dropdown */}
              {userDropdownOpen && user && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white text-gray-800 rounded-md shadow-xl border border-gray-100 py-1.5 z-50 text-sm">
                  <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-500">Hello,</p>
                    <p className="font-bold text-gray-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-blue-600 capitalize font-medium">
                      {user.role} Account
                    </p>
                  </div>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-indigo-700 hover:bg-indigo-50 font-semibold"
                    >
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      Admin Dashboard
                    </Link>
                  )}

                  <Link
                    to="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    My Profile
                  </Link>

                  <Link
                    to="/orders"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    <Package className="w-4 h-4 text-gray-500" />
                    Orders & Tracking
                  </Link>

                  <Link
                    to="/wishlist"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    <Heart className="w-4 h-4 text-gray-500" />
                    Wishlist ({productIds.length})
                  </Link>

                  <div className="border-t border-gray-100 mt-1"></div>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Wishlist Icon */}
            <Link
              to="/wishlist"
              className="relative flex items-center gap-1.5 text-white hover:text-yellow-200 transition font-medium text-sm hidden sm:flex"
              title="My Wishlist"
            >
              <div className="relative">
                <Heart className="w-5 h-5" />
                {productIds.length > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {productIds.length}
                  </span>
                )}
              </div>
              <span className="hidden lg:inline">Wishlist</span>
            </Link>

            {/* Cart Icon */}
            <Link
              to="/cart"
              className="relative flex items-center gap-2 bg-blue-700/60 hover:bg-blue-700 text-white px-3 py-1.5 rounded-sm transition font-bold text-sm"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-yellow-300" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-[#FFE500] text-blue-950 text-[11px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {itemCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">Cart</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Category Strip */}
      <nav className="bg-white text-gray-800 border-b border-gray-200 shadow-xs hidden md:block">
        <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8">
          <ul className="flex items-center justify-between gap-1 overflow-x-auto py-2.5 text-xs font-semibold">
            <li>
              <Link
                to="/products"
                className={`px-3 py-1 rounded hover:text-blue-600 transition whitespace-nowrap ${
                  location.pathname === '/products' && !location.search
                    ? 'text-blue-600 font-bold'
                    : ''
                }`}
              >
                All Products
              </Link>
            </li>
            {categories.slice(0, 10).map((cat) => (
              <li key={cat._id}>
                <Link
                  to={`/products?category=${encodeURIComponent(cat.name)}`}
                  className="px-2.5 py-1 rounded hover:text-blue-600 transition whitespace-nowrap flex items-center gap-1 group"
                >
                  <span>{cat.name}</span>
                  {cat.itemCount !== undefined && cat.itemCount > 0 && (
                    <span className="text-[10px] text-gray-400 group-hover:text-blue-500 font-normal">
                      ({cat.itemCount})
                    </span>
                  )}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/products?deals=true"
                className="px-3 py-1 rounded text-rose-600 font-bold hover:bg-rose-50 transition whitespace-nowrap flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Top Offers
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white text-gray-900 border-b border-gray-200 p-4 shadow-lg">
          <div className="space-y-3">
            <div className="font-bold text-gray-700 text-xs uppercase tracking-wider mb-2">
              Shop by Category
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm font-medium">
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded bg-gray-50 hover:bg-blue-50 hover:text-blue-600"
              >
                All Products
              </Link>
              <Link
                to="/products?deals=true"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded bg-rose-50 text-rose-600 font-bold"
              >
                ⚡ Top Offers
              </Link>
              {categories.map((c) => (
                <Link
                  key={c._id}
                  to={`/products?category=${encodeURIComponent(c.name)}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded bg-gray-50 hover:bg-blue-50 hover:text-blue-600 truncate"
                >
                  {c.name}
                </Link>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-200 flex flex-col gap-2">
              <Link
                to="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 text-sm font-semibold"
              >
                <Package className="w-4 h-4 text-blue-600" /> My Orders & Tracking
              </Link>
              <Link
                to="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 text-sm font-semibold"
              >
                <Heart className="w-4 h-4 text-rose-500" /> My Wishlist ({productIds.length})
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-2 rounded bg-indigo-50 text-indigo-700 text-sm font-bold"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-600" /> Admin Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pincode Change Modal */}
      {pincodeModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in">
            <h3 className="font-bold text-lg text-gray-900 mb-1">Select Delivery Location</h3>
            <p className="text-xs text-gray-500 mb-4">
              Enter your PIN code to check product availability and fastest delivery timelines.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Enter 6-digit PIN"
                maxLength={6}
                value={newPincode}
                onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, ''))}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold"
              />
              <button
                onClick={() => {
                  if (newPincode.length === 6) {
                    setPincode(newPincode);
                    setPincodeModalOpen(false);
                    setNewPincode('');
                  }
                }}
                disabled={newPincode.length !== 6}
                className="bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                Apply
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPincodeModalOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-800 font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
