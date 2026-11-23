import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, X, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../../services/api.ts';
import { ICategory } from '../../types.ts';
import { useToast } from '../../context/ToastContext.tsx';

export const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { showToast } = useToast();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/categories');
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (err: any) {
      showToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentId('');
    setName('');
    setDescription('');
    setImage(
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=400&q=80'
    );
    setIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (c: ICategory) => {
    setIsEditing(true);
    setCurrentId(c._id);
    setName(c.name);
    setDescription(c.description || '');
    setImage(c.image);
    setIsActive(c.isActive);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      showToast('Category name is required.', 'error');
      return;
    }

    try {
      if (isEditing) {
        const { data } = await api.put(`/categories/${currentId}`, {
          name,
          description,
          image,
          isActive,
        });
        if (data.success) {
          showToast('Category updated successfully!', 'success');
          setModalOpen(false);
          fetchCategories();
        }
      } else {
        const { data } = await api.post('/categories', {
          name,
          description,
          image,
          isActive,
        });
        if (data.success) {
          showToast('Category created successfully!', 'success');
          setModalOpen(false);
          fetchCategories();
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!window.confirm(`Delete category "${catName}"?`)) return;
    try {
      const { data } = await api.delete(`/categories/${id}`);
      if (data.success) {
        showToast('Category deleted.', 'info');
        setCategories(categories.filter((c) => c._id !== id));
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Category Management</h1>
          <p className="text-xs text-gray-500">
            Create, update, activate or deactivate departments and catalog groupings.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((c) => (
          <div
            key={c._id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="relative aspect-video bg-gray-100 overflow-hidden">
                <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                <span
                  className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded shadow ${
                    c.isActive ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-900 text-sm">{c.name}</h3>
                  <span className="text-[11px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">
                    {c.itemCount || 0} products
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {c.description || 'No description provided'}
                </p>
              </div>
            </div>

            <div className="p-3 px-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50/50">
              <button
                onClick={() => handleOpenEdit(c)}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold p-1 cursor-pointer flex items-center gap-1"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => handleDelete(c._id, c.name)}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold p-1 cursor-pointer flex items-center gap-1 ml-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-bold text-base text-gray-900">
                {isEditing ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Image URL *</label>
                <input
                  type="url"
                  required
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Active (Visible to customers on store)
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
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded shadow transition cursor-pointer"
                >
                  {isEditing ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
