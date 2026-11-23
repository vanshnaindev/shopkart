import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  Heart,
  ShoppingCart,
  Zap,
  Truck,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  MapPin,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { IProduct, IReview } from '../types.ts';
import { useCart } from '../context/CartContext.tsx';
import { useWishlist } from '../context/WishlistContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { ProductCard } from '../components/products/ProductCard.tsx';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [product, setProduct] = useState<IProduct | null>(null);
  const [reviews, setReviews] = useState<IReview[]>([]);
  const [related, setRelated] = useState<IProduct[]>([]);
  const [activeImage, setActiveImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  // Delivery check state
  const [checkPincode, setCheckPincode] = useState('560038');
  const [pincodeVerified, setPincodeVerified] = useState(true);

  // Review Form state
  const [newRating, setNewRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/products/${id}`);
        if (data.success && data.product) {
          setProduct(data.product);
          setActiveImage(data.product.images[0] || '');
          setReviews(data.reviews || []);
          setRelated(data.relatedProducts || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
      window.scrollTo(0, 0);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F3F6] py-12 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F1F3F6] py-16 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Product Not Found</h2>
        <Link to="/products" className="text-blue-600 font-semibold text-sm underline">
          Return to All Products
        </Link>
      </div>
    );
  }

  const isFavorited = isInWishlist(product._id);
  const isOutOfStock = product.stock === 0;

  const handleBuyNow = async () => {
    const ok = await addToCart(product, quantity);
    if (ok) {
      navigate('/checkout');
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please login to write a verified customer review.', 'info');
      navigate('/login');
      return;
    }
    if (!reviewComment.trim()) {
      showToast('Please enter your review feedback.', 'error');
      return;
    }

    try {
      setSubmittingReview(true);
      const { data } = await api.post('/reviews', {
        productId: product._id,
        rating: newRating,
        title: reviewTitle,
        comment: reviewComment,
      });

      if (data.success) {
        showToast('Review submitted successfully!', 'success');
        setReviews([data.review, ...reviews]);
        setReviewTitle('');
        setReviewComment('');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F3F6] py-6">
      <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4 overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-blue-600">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <Link
            to={`/products?category=${encodeURIComponent(product.category)}`}
            className="hover:text-blue-600"
          >
            {product.category}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-800 font-medium truncate max-w-xs">{product.name}</span>
        </div>

        {/* Main Product Container */}
        <div className="bg-white rounded-lg shadow-xs border border-gray-100 p-4 sm:p-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Gallery & CTA Buttons */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Main View Area */}
              <div className="relative aspect-square bg-gray-50/50 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center p-6">
                <img
                  src={activeImage}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={() => toggleWishlist(product._id)}
                  className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center transition cursor-pointer"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      isFavorited
                        ? 'fill-rose-500 text-rose-500'
                        : 'text-gray-400 hover:text-rose-500'
                    }`}
                  />
                </button>
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`w-16 h-16 rounded border-2 p-1 bg-white shrink-0 overflow-hidden cursor-pointer ${
                        activeImage === img
                          ? 'border-blue-600'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}

              {/* Action Buttons: Add to Cart & Buy Now */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => addToCart(product, quantity)}
                  disabled={isOutOfStock}
                  className="flex items-center justify-center gap-2 bg-[#FF9F00] hover:bg-[#e89000] disabled:bg-gray-200 text-white font-bold py-3.5 px-4 rounded shadow-sm text-sm uppercase transition cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="flex items-center justify-center gap-2 bg-[#FB641B] hover:bg-[#e0540f] disabled:bg-gray-200 text-white font-bold py-3.5 px-4 rounded shadow-sm text-sm uppercase transition cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  Buy Now
                </button>
              </div>
            </div>

            {/* Right: Details & Specifications */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Brand: <strong className="text-blue-600">{product.brand}</strong> | SKU:{' '}
                  {product.sku}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 leading-snug">
                  {product.name}
                </h1>
              </div>

              {/* Rating & Reviews pill */}
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-1 bg-[#388E3C] text-white text-xs font-bold px-2 py-0.5 rounded">
                  <span>{product.averageRating || 4.5}</span>
                  <Star className="w-3.5 h-3.5 fill-white" />
                </div>
                <span className="text-xs text-gray-600 font-medium">
                  {product.numReviews.toLocaleString()} Ratings & {reviews.length} Reviews
                </span>
                <span className="text-emerald-700 bg-emerald-50 text-[11px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                  ShopKart Assured ✦
                </span>
              </div>

              {/* Price section */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-gray-900">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>
                  {product.originalPrice > product.price && (
                    <>
                      <span className="text-base text-gray-400 line-through">
                        ₹{product.originalPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-emerald-600 font-bold text-base">
                        {product.discount}% off
                      </span>
                    </>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Inclusive of all taxes. Free delivery on orders over ₹500.
                </div>
              </div>

              {/* Stock status & Quantity */}
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-xs text-gray-500 font-medium block mb-1">
                    Availability:
                  </span>
                  {product.stock > 10 ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" /> In Stock ({product.stock} units
                      available)
                    </span>
                  ) : product.stock > 0 ? (
                    <span className="text-amber-600 font-bold text-xs">
                      Hurry, only {product.stock} left in stock!
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold text-xs">Currently Out of Stock</span>
                  )}
                </div>

                {!isOutOfStock && (
                  <div>
                    <span className="text-xs text-gray-500 font-medium block mb-1">Quantity:</span>
                    <select
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="text-xs border border-gray-300 rounded p-1.5 font-bold focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      {[...Array(Math.min(10, product.stock))].map((_, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {idx + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* PIN code delivery check */}
              <div className="pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500 font-semibold block mb-1.5">
                  Delivery & Services:
                </span>
                <div className="flex items-center gap-2 max-w-xs">
                  <div className="relative flex-1">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      maxLength={6}
                      value={checkPincode}
                      onChange={(e) => {
                        setCheckPincode(e.target.value.replace(/\D/g, ''));
                        setPincodeVerified(false);
                      }}
                      placeholder="Enter Delivery PIN"
                      className="w-full text-xs pl-8 pr-3 py-2 border border-gray-300 rounded font-semibold focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (checkPincode.length === 6) setPincodeVerified(true);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-2 border border-blue-200 rounded hover:bg-blue-50 transition cursor-pointer"
                  >
                    Check
                  </button>
                </div>
                {pincodeVerified && (
                  <div className="mt-2 text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    Delivery by Tomorrow, 11:00 PM | <span className="font-bold">Free</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="pt-3 border-t border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm mb-1.5">Product Description</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{product.description}</p>
              </div>

              {/* Specifications table */}
              {product.specifications && product.specifications.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <h3 className="font-bold text-gray-900 text-sm mb-2.5">Specifications</h3>
                  <div className="border border-gray-200 rounded divide-y divide-gray-100 text-xs">
                    {product.specifications.map((spec, i) => (
                      <div key={i} className="grid grid-cols-3 p-2.5">
                        <span className="text-gray-500 font-medium">{spec.name}</span>
                        <span className="col-span-2 text-gray-800 font-semibold">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <div className="bg-white rounded-lg shadow-xs border border-gray-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-100 mb-6 gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Ratings & Customer Reviews
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Authentic feedback from verified purchasers across India
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-[#388E3C] text-white text-sm font-bold px-3 py-1 rounded">
                <span>{product.averageRating || 4.5}</span>
                <Star className="w-4 h-4 fill-white" />
              </div>
              <span className="text-xs text-gray-600 font-semibold">
                Based on {reviews.length} customer reviews
              </span>
            </div>
          </div>

          {/* Write Review Form */}
          <form
            onSubmit={handleAddReview}
            className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 mb-6"
          >
            <h4 className="font-bold text-sm text-gray-900 mb-2">
              Write a Review for this Product
            </h4>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-600 font-medium">Rating:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNewRating(s)}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        s <= newRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 mb-3">
              <input
                type="text"
                placeholder="Review headline (e.g. Outstanding battery life and display!)"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded focus:outline-none focus:border-blue-600"
              />
              <textarea
                rows={3}
                placeholder="Share your detailed experience with this product..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-gray-300 rounded focus:outline-none focus:border-blue-600"
              />
            </div>
            <button
              type="submit"
              disabled={submittingReview}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded transition cursor-pointer"
            >
              {submittingReview ? 'Submitting...' : 'Post Review'}
            </button>
          </form>

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">
              No reviews yet for this product. Be the first to share your thoughts!
            </div>
          ) : (
            <div className="divide-y divide-gray-100 space-y-4">
              {reviews.map((rev) => (
                <div key={rev._id} className="pt-4 first:pt-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-[#388E3C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      {rev.rating} <Star className="w-2.5 h-2.5 fill-white" />
                    </span>
                    <span className="font-bold text-xs text-gray-900">
                      {rev.title || 'Verified Review'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed mb-2">{rev.comment}</p>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="font-semibold text-gray-600">{rev.userName}</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Purchase
                    </span>
                    <span>•</span>
                    <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="bg-white rounded-lg shadow-xs border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Similar Products You Might Like
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((prod) => (
                <ProductCard key={prod._id} product={prod} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
