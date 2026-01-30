'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabaseClient';
import { ArrowLeft, Search, Shield, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  full_name: string;
}

export default function ConvertUserPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const adminRoles = [
    { value: 'admin', label: 'Platform Admin', icon: '🛡️' },
    { value: 'police', label: 'Police Officer', icon: '👮' },
    { value: 'fire', label: 'Fire Department', icon: '🚒' },
    { value: 'hospital', label: 'Hospital/Medical', icon: '🏥' },
    { value: 'ems', label: 'Emergency Medical Services', icon: '🚑' },
  ];

  // Check auth
  useEffect(() => {
    if (authLoading) return;

    if (!user || user.email !== 'timolanda@gmail.com') {
      router.replace('/');
      return;
    }

    setAuthChecked(true);
  }, [user, authLoading, router]);

  // Search users
  const handleSearch = async () => {
    if (!searchEmail.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // Search in profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, full_name')
        .ilike('email', `%${searchEmail}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
      if (data?.length === 0) {
        setMessage({ type: 'error', text: '❌ No users found with that email' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      console.error('Search error:', err);
      setMessage({ type: 'error', text: '❌ Failed to search users' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Convert user to admin
  const handleConvertUser = async () => {
    if (!selectedUser || !user?.email) return;

    setLoading(true);
    try {
      // Call API to convert user
      const response = await fetch('/api/admin/convert-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          targetRole: selectedRole,
          callerEmail: user.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to convert user');
      }

      setMessage({
        type: 'success',
        text: `✅ ${selectedUser.email} is now a ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}!`,
      });

      // Reset form
      setSelectedUser(null);
      setSearchEmail('');
      setSearchResults([]);
      setSelectedRole('admin');

      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      console.error('Conversion error:', err);
      setMessage({
        type: 'error',
        text: `❌ ${err instanceof Error ? err.message : 'Failed to convert user'}`,
      });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked || authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.email !== 'timolanda@gmail.com') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p>This page is only available to the platform owner</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Convert User to Admin</h1>
            <p className="text-gray-400 text-sm">Assign admin roles to users</p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-900/20 border border-green-500/30 text-green-200'
                : 'bg-red-900/20 border border-red-500/30 text-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Search Section */}
        <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <Search className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold">Find User</h2>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter user email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">Found {searchResults.length} user(s):</p>
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedUser?.id === u.id
                        ? 'bg-blue-900/50 border border-blue-500/50'
                        : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{u.full_name || u.email}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Current role: <span className="text-gray-300 capitalize">{u.role || 'User'}</span>
                        </p>
                      </div>
                      {selectedUser?.id === u.id && (
                        <CheckCircle className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Role Selection */}
        {selectedUser && (
          <section className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-semibold">Select New Role</h2>
            </div>

            <div className="space-y-2">
              {adminRoles.map((role) => (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`w-full p-4 rounded-lg text-left transition-all ${
                    selectedRole === role.value
                      ? 'bg-purple-900/30 border border-purple-500/50 shadow-lg shadow-purple-500/20'
                      : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-800/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{role.icon}</span>
                      <div>
                        <p className="font-medium">{role.label}</p>
                        <p className="text-xs text-gray-400">Role: {role.value}</p>
                      </div>
                    </div>
                    {selectedRole === role.value && (
                      <div className="w-2 h-2 bg-purple-400 rounded-full" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* User Info & Confirmation */}
        {selectedUser && (
          <section className="bg-blue-900/20 rounded-xl p-6 border border-blue-500/30">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold">Confirm Conversion</h2>
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-3 bg-gray-800/30 rounded-lg">
                <p className="text-xs text-gray-400">User Email</p>
                <p className="font-medium">{selectedUser.email}</p>
              </div>
              <div className="p-3 bg-gray-800/30 rounded-lg">
                <p className="text-xs text-gray-400">Current Role</p>
                <p className="font-medium capitalize">{selectedUser.role || 'User'}</p>
              </div>
              <div className="p-3 bg-gray-800/30 rounded-lg">
                <p className="text-xs text-gray-400">New Role</p>
                <p className="font-medium capitalize">{selectedRole}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedUser(null)}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertUser}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Converting...' : 'Convert User'}
              </button>
            </div>
          </section>
        )}

        {/* Info Box */}
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-200 space-y-2">
          <p className="font-semibold">⚠️ Important</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>This action converts users to admin roles</li>
            <li>Admin users can manage alerts and responders</li>
            <li>Role assignments can be changed anytime</li>
            <li>Use this feature responsibly</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
