import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Check,
  X,
  Star,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { IProduct, ICategory } from '../../types.ts';
import { useToast } from '../../context/ToastContext.tsx';

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const { showToast } = useToast();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [stock, setStock] = useState('20');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        api.get('/products?limit=100'),
        api.get('/categories'),
      ]);
      if (prodRes.data.success) setProducts(prodRes.data.products);
      if (catRes.data.success) setCategories(catRes.data.categories);
    } catch (err: any) {
      showToast('Failed to load products catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCurrentId('');
    setName('');
    setBrand('');
    setCategory(categories[0]?.name || 'Electronics');
    setPrice('');
    setOriginalPrice('');
    setStock('25');
    setSku('SKU-' + Math.random().toString(36).substring(2, 7).toUpperCase());
    setDescription('');
    setImageUrl(
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
    );
    setIsFeatured(false);
    setIsBestSeller(false);
    setModalOpen(true);
  };

  const handleOpenEditModal = (p: IProduct) => {
    setIsEditing(true);
    setCurrentId(p._id);
    setName(p.name);
    setBrand(p.brand);
    setCategory(p.category);
    setPrice(String(p.price));
    setOriginalPrice(String(p.originalPrice));
    setStock(String(p.stock));
    setSku(p.sku);
    setDescription(p.description);
    setImageUrl(p.images[0] || '');
    setIsFeatured(p.isFeatured);
    setIsBestSeller(p.isBestSeller);
    setModalOpen(true);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !category) {
      showToast('Name, price and category are required.', 'error');
      return;
    }

    const payload = {
      name,
      brand: brand || 'Generic',
      category,
      price: Number(price),
      originalPrice: Number(originalPrice || price),
      stock: Number(stock || 0),
      sku: sku || 'SKU-' + Date.now(),
      description,
      images: [imageUrl],
      isFeatured,
      isBestSeller,
    };

    try {
      if (isEditing) {
        const { data } = await api.put(`/products/${currentId}`, payload);
        if (data.success) {
          showToast('Product updated successfully!', 'success');
          setModalOpen(false);
          fetchProducts();
        }
      } else {
        const { data } = await api.post('/products', payload);
        if (data.success) {
          showToast('Product added successfully!', 'success');
          setModalOpen(false);
          fetchProducts();
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${prodName}" from the catalog?`)) return;
    try {
      const { data } = await api.delete(`/products/${id}`);
      if (data.success) {
        showToast('Product deleted successfully.', 'info');
        setProducts(products.filter((p) => p._id !== id));
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const handleBulkImport = async () => {
    if (!csvContent.trim()) {
      showToast('Please provide CSV data or sample records.', 'error');
      return;
    }

    try {
      // Parse CSV rows
      const lines = csvContent.trim().split('\n');
      const parsedProducts = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [name, brand, category, price, stock, image] = line
          .split(',')
          .map((s) => s.replace(/(^"|"$)/g, '').trim());
        if (name && price) {
          parsedProducts.push({
            name,
            brand: brand || 'Brand',
            category: category || 'Electronics',
            price: Number(price),
            stock: Number(stock || 20),
            image:
              image ||
              'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
          });
        }
      }

      if (parsedProducts.length === 0) {
        showToast(
          'No valid CSV rows parsed. Check header: Name,Brand,Category,Price,Stock,Image',
          'error'
        );
        return;
      }

      const { data } = await api.post('/products/bulk-import', { products: parsedProducts });
      showToast(data.message, 'success');
      setBulkModalOpen(false);
      setCsvContent('');
      fetchProducts();
    } catch (err: any) {
      showToast('Bulk import failed: ' + err.message, 'error');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Product Catalog Management
          </h1>
          <p className="text-xs text-gray-500">
            Create, edit, delete, and bulk import products with real-time stock and price
            adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCsvContent(`Name,Brand,Category,Price,Stock,Image
Sony WH-CH720N Noise Canceling Headphones,Sony,Electronics,9990,30,https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80
OnePlus Nord 4 5G 128GB,OnePlus,Mobiles,29999,40,https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80`);
              setBulkModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 text-xs font-bold px-3 py-2 rounded shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Bulk CSV Import
          </button>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, brand or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-gray-500 font-semibold whitespace-nowrap">
            Filter Category:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs border border-gray-300 rounded p-2 font-semibold bg-white cursor-pointer"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="p-3.5 pl-5">Product</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Price / MRP</th>
                <th className="p-3.5">Stock</th>
                <th className="p-3.5">Rating</th>
                <th className="p-3.5">Badges</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((p) => (
                <tr key={p._id} className="hover:bg-blue-50/30 transition">
                  <td className="p-3.5 pl-5">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.images[0]}
                        alt=""
                        className="w-10 h-10 object-contain rounded bg-gray-50 p-1 border shrink-0"
                      />
                      <div className="max-w-xs">
                        <span className="font-bold text-gray-900 block truncate">{p.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {p.brand} • {p.sku}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 font-semibold text-gray-600">{p.category}</td>
                  <td className="p-3.5">
                    <div className="font-bold text-gray-900">
                      ₹{p.price.toLocaleString('en-IN')}
                    </div>
                    {p.originalPrice > p.price && (
                      <div className="text-[10px] text-gray-400 line-through">
                        ₹{p.originalPrice.toLocaleString('en-IN')} ({p.discount}% off)
                      </div>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        p.stock === 0
                          ? 'bg-rose-100 text-rose-800'
                          : p.stock <= 15
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {p.stock} units
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="inline-flex items-center gap-1 bg-[#388E3C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      <span>{p.averageRating}</span>
                      <Star className="w-2.5 h-2.5 fill-white" />
                    </div>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1">
                      {p.isBestSeller && (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                          Best Seller
                        </span>
                      )}
                      {p.isFeatured && (
                        <span className="bg-blue-100 text-blue-800 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                          Featured
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 pr-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                        title="Edit product"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p._id, p.name)}
                        className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-bold text-base text-gray-900">
                {isEditing ? 'Edit Catalog Product' : 'Add New Product to Catalog'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sony WH-1000XM5 Noise Cancelling Headphones"
                  className="w-full p-2.5 border border-gray-300 rounded focus:border-blue-600 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Brand *</label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Sony"
                    className="w-full p-2.5 border border-gray-300 rounded focus:border-blue-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded focus:border-blue-600 font-semibold bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 26990"
                    className="w-full p-2.5 border border-gray-300 rounded focus:border-blue-600 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Original MRP (₹)</label>
                  <input
                    type="number"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="e.g. 34990"
                    className="w-full p-2.5 border border-gray-300 rounded focus:border-blue-600 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full p-2.5 border border-gray-300 rounded focus:border-blue-600 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Image URL (Unsplash or CDN) *
                </label>
                <input
                  type="url"
                  required
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded focus:border-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Product Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  Mark as Featured Product
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={isBestSeller}
                    onChange={(e) => setIsBestSeller(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  Mark as Best Seller
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded shadow transition cursor-pointer"
                >
                  {isEditing ? 'Save Product' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-xl w-full shadow-2xl animate-in fade-in">
            <h3 className="font-bold text-base text-gray-900 mb-2">Bulk CSV Product Import</h3>
            <p className="text-xs text-gray-500 mb-3">
              Paste CSV text formatted as: <code>Name,Brand,Category,Price,Stock,Image</code>
            </p>
            <textarea
              rows={8}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              className="w-full text-xs font-mono p-3 border border-gray-300 rounded mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="text-xs text-gray-600 hover:text-gray-900 px-3 py-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 rounded shadow cursor-pointer"
              >
                Import Products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
