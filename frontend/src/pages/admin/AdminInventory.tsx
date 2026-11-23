import React, { useState, useEffect } from 'react';
import { Boxes, AlertTriangle, ArrowUpDown, History, Plus, Minus, Search } from 'lucide-react';
import { api } from '../../services/api.ts';
import { IProduct, IInventoryLog } from '../../types.ts';
import { useToast } from '../../context/ToastContext.tsx';

export const AdminInventory: React.FC = () => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [lowStock, setLowStock] = useState<IProduct[]>([]);
  const [outOfStock, setOutOfStock] = useState<IProduct[]>([]);
  const [logs, setLogs] = useState<IInventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('10');
  const [adjustmentReason, setAdjustmentReason] = useState('Stock Intake / Shipment Arrival');
  const [saving, setSaving] = useState(false);

  const { showToast } = useToast();

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/inventory');
      if (data.success) {
        setProducts(data.products);
        setLowStock(data.lowStock);
        setOutOfStock(data.outOfStock);
        setLogs(data.logs || []);
      }
    } catch (err: any) {
      showToast('Failed to load inventory data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleOpenAdjust = (p: IProduct) => {
    setSelectedProduct(p);
    setAdjustmentQuantity('10');
    setAdjustmentReason('Stock Intake / Shipment Arrival');
    setAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      setSaving(true);
      const { data } = await api.patch(`/admin/inventory/${selectedProduct._id}`, {
        adjustment: Number(adjustmentQuantity),
        reason: adjustmentReason,
      });

      if (data.success) {
        showToast('Stock adjusted successfully!', 'success');
        setAdjustModalOpen(false);
        fetchInventory();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Adjustment failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Inventory &amp; Stock Levels
          </h1>
          <p className="text-xs text-gray-500">
            Monitor real-time warehouse inventory, manage safety thresholds, and track restocking
            history.
          </p>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Total Catalog Items
          </span>
          <div className="text-2xl font-black text-gray-900 mt-1">{products.length}</div>
          <span className="text-[11px] text-gray-400">Unique SKUs tracked</span>
        </div>

        <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 text-amber-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock Warnings</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black mt-1">{lowStock.length} items</div>
          <span className="text-[11px] text-amber-700">Stock &le; 15 units remaining</span>
        </div>

        <div className="bg-rose-50 rounded-xl p-5 border border-rose-200 text-rose-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Out of Stock Items</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black mt-1">{outOfStock.length} items</div>
          <span className="text-[11px] text-rose-700">Needs immediate replenishment</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search inventory by product name, SKU or brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600 font-medium"
          />
        </div>
      </div>

      {/* Products Stock Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="p-3.5 pl-5">Product Name</th>
                <th className="p-3.5">SKU</th>
                <th className="p-3.5">Selling Price</th>
                <th className="p-3.5">Available Stock</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-5 text-right">Quick Stock Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((p) => (
                <tr key={p._id} className="hover:bg-blue-50/30 transition">
                  <td className="p-3.5 pl-5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={p.images[0]}
                        alt=""
                        className="w-8 h-8 object-contain rounded border p-0.5"
                      />
                      <span className="font-bold text-gray-900 max-w-xs truncate">{p.name}</span>
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-gray-600 font-semibold">{p.sku}</td>
                  <td className="p-3.5 font-bold text-gray-900">
                    ₹{p.price.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3.5 font-black text-sm text-gray-900">{p.stock} units</td>
                  <td className="p-3.5">
                    {p.stock === 0 ? (
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        Out of Stock
                      </span>
                    ) : p.stock <= 15 ? (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        Low Stock
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        Adequate
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 pr-5 text-right">
                    <button
                      onClick={() => handleOpenAdjust(p)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded transition text-xs cursor-pointer"
                    >
                      Adjust Stock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Audit Logs */}
      {logs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" /> Stock Adjustment Audit History
          </h3>
          <div className="divide-y divide-gray-100 text-xs">
            {logs.slice(0, 8).map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-gray-900">{log.productName}</span>
                  <div className="text-[11px] text-gray-500">
                    Reason: {log.reason} • By {log.updatedBy} (
                    {new Date(log.timestamp).toLocaleString()})
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`font-black text-xs ${
                      log.change > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {log.change > 0 ? `+${log.change}` : log.change} units
                  </span>
                  <div className="text-[10px] text-gray-400">
                    {log.previousStock} &rarr; {log.newStock}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Adjust Modal */}
      {adjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in text-xs">
            <h3 className="font-bold text-base text-gray-900 mb-1">Adjust Inventory</h3>
            <p className="text-gray-500 text-[11px] mb-4 truncate">{selectedProduct.name}</p>

            <form onSubmit={handleSaveAdjustment} className="space-y-3">
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Stock Change (+ to add, - to reduce)
                </label>
                <input
                  type="number"
                  required
                  value={adjustmentQuantity}
                  onChange={(e) => setAdjustmentQuantity(e.target.value)}
                  placeholder="e.g. +20 or -5"
                  className="w-full p-2.5 border border-gray-300 rounded font-black text-sm"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Current stock: {selectedProduct.stock} units. New will be:{' '}
                  <strong>
                    {Math.max(0, selectedProduct.stock + Number(adjustmentQuantity || 0))}
                  </strong>
                </span>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Reason for Adjustment *
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded bg-white font-semibold"
                >
                  <option value="Stock Intake / Shipment Arrival">
                    Stock Intake / Shipment Arrival
                  </option>
                  <option value="Damaged Stock Write-off">Damaged Stock Write-off</option>
                  <option value="Manual Inventory Count Correction">
                    Manual Inventory Count Correction
                  </option>
                  <option value="Vendor Return">Vendor Return</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded shadow transition cursor-pointer"
                >
                  {saving ? 'Updating...' : 'Save Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
