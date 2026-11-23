import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, X, CheckCircle2, Percent, DollarSign } from 'lucide-react';
import { api } from '../../services/api.ts';
import { ICoupon } from '../../types.ts';
import { useToast } from '../../context/ToastContext.tsx';

export const AdminCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<ICoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');

  // Form State
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('15');
  const [minimumOrderAmount, setMinimumOrderAmount] = useState('1999');
  const [maxDiscount, setMaxDiscount] = useState('1500');
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [usageLimit, setUsageLimit] = useState('5000');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { showToast } = useToast();

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/coupons/all');
      if (data.success) {
        setCoupons(data.coupons);
      }
    } catch (err: any) {
      showToast('Failed to load coupons', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentId('');
    setCode('FESTIVE' + Math.floor(10 + Math.random() * 90));
    setDiscountType('percentage');
    setDiscountValue('20');
    setMinimumOrderAmount('2499');
    setMaxDiscount('2000');
    setExpiryDate('2027-12-31');
    setUsageLimit('2000');
    setDescription('Festive special discount on cart checkout');
    setIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (c: ICoupon) => {
    setIsEditing(true);
    setCurrentId(c._id);
    setCode(c.code);
    setDiscountType(c.discountType);
    setDiscountValue(String(c.discountValue));
    setMinimumOrderAmount(String(c.minimumOrderAmount));
    setMaxDiscount(c.maxDiscount ? String(c.maxDiscount) : '');
    setExpiryDate(c.expiryDate.split('T')[0]);
    setUsageLimit(String(c.usageLimit));
    setDescription(c.description || '');
    setIsActive(c.isActive);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discountValue) {
      showToast('Coupon code and discount value are required.', 'error');
      return;
    }

    const payload = {
      code,
      discountType,
      discountValue: Number(discountValue),
      minimumOrderAmount: Number(minimumOrderAmount || 0),
      maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
      expiryDate: new Date(expiryDate).toISOString(),
      usageLimit: Number(usageLimit || 1000),
      description,
      isActive,
    };

    try {
      if (isEditing) {
        const { data } = await api.put(`/coupons/${currentId}`, payload);
        if (data.success) {
          showToast('Coupon updated successfully!', 'success');
          setModalOpen(false);
          fetchCoupons();
        }
      } else {
        const { data } = await api.post('/coupons', payload);
        if (data.success) {
          showToast('Coupon created successfully!', 'success');
          setModalOpen(false);
          fetchCoupons();
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (id: string, codeName: string) => {
    if (!window.confirm(`Delete coupon "${codeName}"?`)) return;
    try {
      const { data } = await api.delete(`/coupons/${id}`);
      if (data.success) {
        showToast('Coupon deleted.', 'info');
        setCoupons(coupons.filter((c) => c._id !== id));
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
            Coupon &amp; Discount Management
          </h1>
          <p className="text-xs text-gray-500">
            Create promotional coupon codes, percentage rules, and cart minimum values.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Coupon
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((c) => (
          <div
            key={c._id}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-base font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                  {c.code}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs font-bold text-gray-900 mt-2">
                {c.discountType === 'percentage'
                  ? `${c.discountValue}% Off (Up to ₹${c.maxDiscount?.toLocaleString() || 'Unlimited'})`
                  : `Flat ₹${c.discountValue.toLocaleString()} Off`}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {c.description || 'Valid on all checkout orders'}
              </p>

              <div className="mt-4 pt-3 border-t border-gray-100 space-y-1 text-[11px] text-gray-500">
                <div className="flex justify-between">
                  <span>Min Order Value:</span>
                  <strong className="text-gray-800">
                    ₹{c.minimumOrderAmount.toLocaleString()}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Usage:</span>
                  <strong className="text-gray-800">
                    {c.usedCount} / {c.usageLimit} redeemed
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Expires:</span>
                  <strong className="text-gray-800">
                    {new Date(c.expiryDate).toLocaleDateString()}
                  </strong>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => handleOpenEdit(c)}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold p-1 cursor-pointer flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => handleDelete(c._id, c.code)}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold p-1 cursor-pointer flex items-center gap-1 ml-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Coupon Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl animate-in fade-in text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-bold text-base text-gray-900">
                {isEditing ? 'Edit Coupon' : 'Create New Promotional Coupon'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MEGA500"
                  className="w-full p-2.5 border border-gray-300 rounded font-mono font-bold uppercase focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-300 rounded font-semibold bg-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Flat (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="e.g. 15 or 500"
                    className="w-full p-2.5 border border-gray-300 rounded font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    value={minimumOrderAmount}
                    onChange={(e) => setMinimumOrderAmount(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Max Cap Discount (₹)</label>
                  <input
                    type="number"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    placeholder="Optional"
                    className="w-full p-2.5 border border-gray-300 rounded font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Description / Banner Text
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Flat 15% off up to ₹1,500 on all orders"
                  className="w-full p-2.5 border border-gray-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Usage Limit</label>
                  <input
                    type="number"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded font-semibold"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Active (Can be redeemed by shoppers at checkout)
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded shadow cursor-pointer"
                >
                  {isEditing ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
