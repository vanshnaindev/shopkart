import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  MapPin,
  Lock,
  Package,
  Heart,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { api } from '../services/api.ts';

export const Profile: React.FC = () => {
  const { user, updateProfile, addAddress, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'security'>('profile');

  // Edit Profile state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // New Address form state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrCity, setAddrCity] = useState('Bangalore');
  const [addrState, setAddrState] = useState('Karnataka');
  const [addrPincode, setAddrPincode] = useState('560038');
  const [addrType, setAddrType] = useState<'home' | 'work'>('home');

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    await updateProfile({ name, phone });
    setSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    try {
      setChangingPassword(true);
      const { data } = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      if (data.success) {
        showToast('Password changed successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Password update failed', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrName || !addrPhone || !addrStreet || !addrPincode) {
      showToast('Please fill in all address details.', 'error');
      return;
    }
    const ok = await addAddress({
      fullName: addrName,
      phone: addrPhone,
      street: addrStreet,
      city: addrCity,
      state: addrState,
      pincode: addrPincode,
      type: addrType,
      isDefault: user.addresses.length === 0,
    });
    if (ok) {
      setShowAddressModal(false);
      setAddrName('');
      setAddrPhone('');
      setAddrStreet('');
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F3F6] py-6">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-6">Account Settings</h1>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Sidebar Navigation */}
          <div className="md:col-span-4 space-y-4">
            {/* User Identity Card */}
            <div className="bg-white rounded-lg p-5 shadow-xs border border-gray-200 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Hello,</p>
                <h3 className="font-bold text-gray-900 text-sm truncate">{user.name}</h3>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded capitalize">
                  {user.role} Account
                </span>
              </div>
            </div>

            {/* Menu Links */}
            <div className="bg-white rounded-lg shadow-xs border border-gray-200 divide-y divide-gray-100 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 p-3.5 px-4 text-left cursor-pointer transition ${
                  activeTab === 'profile'
                    ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <User className="w-4 h-4" /> Personal Information
              </button>
              <button
                onClick={() => setActiveTab('addresses')}
                className={`w-full flex items-center gap-3 p-3.5 px-4 text-left cursor-pointer transition ${
                  activeTab === 'addresses'
                    ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <MapPin className="w-4 h-4" /> Manage Addresses ({user.addresses.length})
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 p-3.5 px-4 text-left cursor-pointer transition ${
                  activeTab === 'security'
                    ? 'bg-blue-50 text-blue-600 font-bold border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Lock className="w-4 h-4" /> Security &amp; Password
              </button>
              <Link
                to="/orders"
                className="w-full flex items-center gap-3 p-3.5 px-4 text-left text-gray-700 hover:bg-gray-50"
              >
                <Package className="w-4 h-4 text-gray-500" /> My Orders
              </Link>
              <Link
                to="/wishlist"
                className="w-full flex items-center gap-3 p-3.5 px-4 text-left text-gray-700 hover:bg-gray-50"
              >
                <Heart className="w-4 h-4 text-gray-500" /> My Wishlist
              </Link>
            </div>
          </div>

          {/* Right Area Content */}
          <div className="md:col-span-8 bg-white rounded-lg shadow-xs border border-gray-200 p-6">
            {/* Tab 1: Personal Information */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-base font-bold text-gray-900 pb-3 border-b border-gray-100 mb-5">
                  Personal Information
                </h2>
                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full text-xs p-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full text-xs p-2.5 bg-gray-100 border border-gray-300 rounded text-gray-500 cursor-not-allowed"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Email address is linked to your account security and cannot be changed.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Mobile Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter 10-digit phone"
                      className="w-full text-xs p-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600 font-semibold"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase px-6 py-2.5 rounded shadow transition cursor-pointer"
                    >
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab 2: Saved Addresses */}
            {activeTab === 'addresses' && (
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-5">
                  <h2 className="text-base font-bold text-gray-900">Manage Addresses</h2>
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Address
                  </button>
                </div>

                {user.addresses.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-xs">
                    No addresses saved yet. Click "Add New Address" above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {user.addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="p-4 rounded-lg border border-gray-200 text-xs flex items-start justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900 text-sm">{addr.fullName}</span>
                            <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                              {addr.type}
                            </span>
                            {addr.isDefault && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600">
                            {addr.street}, {addr.city}, {addr.state} -{' '}
                            <strong className="text-gray-900">{addr.pincode}</strong>
                          </p>
                          <p className="text-gray-500 font-semibold mt-1">Phone: {addr.phone}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Security & Password */}
            {activeTab === 'security' && (
              <div>
                <h2 className="text-base font-bold text-gray-900 pb-3 border-b border-gray-100 mb-5">
                  Change Password
                </h2>
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-300 rounded focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase px-6 py-2.5 rounded shadow transition cursor-pointer"
                  >
                    {changingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Add Address Modal */}
        {showAddressModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl animate-in fade-in">
              <h3 className="font-bold text-base text-gray-900 mb-3">Add New Address</h3>
              <form onSubmit={handleAddAddress} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Full Name *"
                    required
                    value={addrName}
                    onChange={(e) => setAddrName(e.target.value)}
                    className="text-xs p-2 border border-gray-300 rounded"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number *"
                    required
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    className="text-xs p-2 border border-gray-300 rounded"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Street / Flat / House *"
                  required
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                  className="w-full text-xs p-2 border border-gray-300 rounded"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="City *"
                    required
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    className="text-xs p-2 border border-gray-300 rounded"
                  />
                  <input
                    type="text"
                    placeholder="State *"
                    required
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                    className="text-xs p-2 border border-gray-300 rounded"
                  />
                  <input
                    type="text"
                    placeholder="PIN Code *"
                    maxLength={6}
                    required
                    value={addrPincode}
                    onChange={(e) => setAddrPincode(e.target.value)}
                    className="text-xs p-2 border border-gray-300 rounded"
                  />
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="mType"
                      checked={addrType === 'home'}
                      onChange={() => setAddrType('home')}
                    />
                    Home
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="mType"
                      checked={addrType === 'work'}
                      onChange={() => setAddrType('work')}
                    />
                    Work
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddressModal(false)}
                    className="text-xs text-gray-500 hover:text-gray-800 px-3 py-2 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded shadow transition cursor-pointer"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
