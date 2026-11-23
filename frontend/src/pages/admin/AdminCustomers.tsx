import React, { useState, useEffect } from 'react';
import { Users, Search, Ban, CheckCircle, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api.ts';
import { IUser } from '../../types.ts';
import { useToast } from '../../context/ToastContext.tsx';

export const AdminCustomers: React.FC = () => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { showToast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/users');
      if (data.success && data.users) {
        setUsers(data.users);
      }
    } catch (err: any) {
      showToast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleBlock = async (user: IUser) => {
    const actionText = user.isBlocked ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${actionText} customer "${user.name}"?`)) return;

    try {
      const { data } = await api.patch(`/admin/users/${user._id}/block`, {
        isBlocked: !user.isBlocked,
      });
      if (data.success) {
        showToast(data.message, 'success');
        setUsers(users.map((u) => (u._id === user._id ? { ...u, isBlocked: !user.isBlocked } : u)));
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Customer Directory &amp; RBAC
          </h1>
          <p className="text-xs text-gray-500">
            Audit registered customer profiles, track purchase history, and manage security account
            locks.
          </p>
        </div>
        <div className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded shadow-xs">
          Total Users: <strong>{users.length}</strong>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-600 font-medium"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="p-3.5 pl-5">Customer Name</th>
                <th className="p-3.5">Email &amp; Phone</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Orders Placed</th>
                <th className="p-3.5">Registered</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-5 text-right">Account Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((u) => (
                <tr key={u._id} className="hover:bg-blue-50/30 transition">
                  <td className="p-3.5 pl-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-gray-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-gray-800">{u.email}</div>
                    <div className="text-[10px] text-gray-400">{u.phone || 'No phone'}</div>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                        u.role === 'admin'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-gray-900 bg-blue-50 px-2 py-0.5 rounded">
                      {u.orderCount || 0} orders
                    </span>
                  </td>
                  <td className="p-3.5 text-gray-500 font-medium">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3.5">
                    {u.isBlocked ? (
                      <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px]">
                        Blocked
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 pr-5 text-right">
                    {u.role !== 'admin' ? (
                      <button
                        onClick={() => handleToggleBlock(u)}
                        className={`text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer ${
                          u.isBlocked
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300'
                        }`}
                      >
                        {u.isBlocked ? 'Unblock' : 'Block User'}
                      </button>
                    ) : (
                      <span className="text-gray-400 text-[10px] italic">Super Admin</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
