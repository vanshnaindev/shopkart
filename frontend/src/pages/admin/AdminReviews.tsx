import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Check, X, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api.ts';
import { IReview } from '../../types.ts';
import { useToast } from '../../context/ToastContext.tsx';

export const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<IReview[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/reviews');
      if (data.success) {
        setReviews(data.reviews || []);
      }
    } catch (err: any) {
      showToast('Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleToggleApprove = async (review: IReview) => {
    try {
      const nextApproved = !review.isApproved;
      const { data } = await api.patch(`/reviews/${review._id}/approve`, {
        approved: nextApproved,
      });
      if (data.success) {
        showToast(data.message, 'success');
        setReviews(
          reviews.map((r) => (r._id === review._id ? { ...r, isApproved: nextApproved } : r))
        );
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      const { data } = await api.delete(`/reviews/${id}`);
      if (data.success) {
        showToast('Review deleted.', 'info');
        setReviews(reviews.filter((r) => r._id !== id));
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Customer Reviews Moderation
          </h1>
          <p className="text-xs text-gray-500">
            Moderate submitted ratings, maintain content authenticity, and remove inappropriate
            reviews.
          </p>
        </div>
        <div className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded shadow-xs">
          Total Reviews: <strong>{reviews.length}</strong>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {reviews.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-xs">
            No customer reviews submitted yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reviews.map((rev) => (
              <div
                key={rev._id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#388E3C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      {rev.rating} <Star className="w-2.5 h-2.5 fill-white" />
                    </span>
                    <span className="font-bold text-gray-900 text-sm">{rev.title || 'Review'}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        rev.isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {rev.isApproved ? 'Approved' : 'Pending / Hidden'}
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 leading-relaxed">{rev.comment}</p>

                  <div className="text-[11px] text-gray-400 flex items-center gap-2 pt-1">
                    <span className="font-semibold text-gray-600">{rev.userName}</span>
                    <span>•</span>
                    <span>Product ID: {rev.productId}</span>
                    <span>•</span>
                    <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleApprove(rev)}
                    className={`text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1 ${
                      rev.isApproved
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-300'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                    }`}
                  >
                    {rev.isApproved ? (
                      <>
                        <X className="w-3.5 h-3.5" /> Disapprove
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Approve
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(rev._id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded transition cursor-pointer"
                    title="Delete review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
