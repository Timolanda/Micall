'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabaseClient';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Users,
  MapPin,
  Shield,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import LoadingIndicator from '@/components/LoadingIndicator';

interface ActiveAlert {
  id: number;
  user_id: string;
  type: string;
  lat: number;
  lng: number;
  status: string;
  created_at: string;
  user?: {
    full_name: string;
    phone: string;
  };
}

interface ResponderPresence {
  id: string;
  lat: number;
  lng: number;
  available: boolean;
  updated_at: string;
  profile?: {
    full_name: string;
    phone: string;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [responders, setResponders] = useState<ResponderPresence[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* =============== AUTH CHECK =============== */
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/landing');
      return;
    }
  }, [loading, user, router]);

  /* =============== CHECK ADMIN ROLE =============== */
  useEffect(() => {
    if (!user) return;

    const checkAdminRole = async () => {
      try {
        // ✅ OWNER - ALWAYS HAS ADMIN ACCESS
        const ownerEmail = 'timolanda@gmail.com';
        const userEmail = user.email?.toLowerCase().trim() || '';
        const isOwner = userEmail === ownerEmail.toLowerCase().trim();

        if (isOwner) {
          console.log('✅ OWNER ACCESS GRANTED:', user.email);
          setIsAdmin(true);
          return;
        }

        // For other users, check role in database
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          console.error('❌ Access denied - no profile or error:', error?.message);
          setIsAdmin(false);
          toast.error('Access denied');
          router.replace('/');
          return;
        }

        const adminRoles = ['admin', 'hospital', 'police', 'fire', 'ems'];
        const hasAdminRole = adminRoles.includes(data?.role?.toLowerCase() || '');

        if (!hasAdminRole) {
          console.error('❌ Access denied - invalid role:', data?.role);
          setIsAdmin(false);
          toast.error('Access denied');
          router.replace('/');
          return;
        }

        setIsAdmin(true);
        console.log('✅ Admin access granted for role:', data?.role);
      } catch (err) {
        console.error('❌ Admin check error:', err);
        setIsAdmin(false);
        toast.error('Access denied');
        router.replace('/');
      }
    };

    checkAdminRole();
  }, [user, router]);

  /* =============== FETCH ALERTS =============== */
  const fetchAlerts = async () => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select(
          `
          id,
          user_id,
          type,
          lat,
          lng,
          status,
          created_at,
          profiles:user_id(full_name, phone)
        `
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalized = (data || []).map((a: any) => ({
        ...a,
        user: a.profiles,
      }));

      setAlerts(normalized);
    } catch (err) {
      console.error('Fetch alerts error:', err);
      toast.error('Failed to fetch alerts');
    } finally {
      setLoadingData(false);
    }
  };

  /* =============== FETCH RESPONDERS =============== */
  const fetchResponders = async () => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('responders')
        .select(
          `
          id,
          lat,
          lng,
          available,
          updated_at,
          profiles:id(full_name, phone)
        `
        )
        .eq('available', true);

      if (error) throw error;

      const normalized = (data || []).map((r: any) => ({
        ...r,
        profile: r.profiles,
      }));

      setResponders(normalized);
    } catch (err) {
      console.error('Fetch responders error:', err);
      toast.error('Failed to fetch responders');
    } finally {
      setLoadingData(false);
    }
  };

  /* =============== INITIAL LOAD =============== */
  useEffect(() => {
    if (!isAdmin) return;

    fetchAlerts();
    fetchResponders();

    // Subscribe to alerts
    const alertChannel = supabase
      .channel('admin-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_alerts' },
        () => fetchAlerts()
      )
      .subscribe();

    // Subscribe to responders
    const responderChannel = supabase
      .channel('admin-responders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'responders' },
        () => fetchResponders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertChannel);
      supabase.removeChannel(responderChannel);
    };
  }, [isAdmin]);

  /* =============== MANUAL REFRESH =============== */
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAlerts(), fetchResponders()]);
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  /* =============== LOGOUT =============== */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/landing');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <LoadingIndicator label="Loading..." />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <Shield size={48} className="mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">You do not have admin permissions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-purple-900/80 to-red-900/80 backdrop-blur border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield size={32} /> Admin Dashboard
            </h1>
            <p className="text-gray-400 text-sm">
              {user?.email} • Real-time emergency monitoring
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-white/10 rounded-lg transition disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw
                size={20}
                className={refreshing ? 'animate-spin' : ''}
              />
            </button>

            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-600/20 rounded-lg transition text-red-400"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* ACTIVE ALERTS SECTION */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle size={24} className="text-red-500" />
            <h2 className="text-2xl font-bold">Active Emergencies</h2>
            <span className="ml-auto bg-red-600 px-3 py-1 rounded-full text-sm font-semibold">
              {alerts.length}
            </span>
          </div>

          {loadingData && !alerts.length ? (
            <div className="text-center py-12 text-gray-400">
              Loading emergencies...
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No active emergencies at this time.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-red-600/10 border border-red-500/30 rounded-lg p-4 hover:bg-red-600/20 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-red-400 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        Alert ID: {alert.id}
                      </h3>
                      <p className="text-sm text-gray-300 mt-1">
                        Type: <span className="font-semibold">{alert.type}</span>
                      </p>
                    </div>
                    <span className="bg-red-600 px-2 py-1 rounded text-xs font-bold">
                      {alert.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-black/40 p-2 rounded">
                      <p className="text-gray-400">Victim</p>
                      <p className="font-semibold">
                        {alert.user?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {alert.user?.phone || 'N/A'}
                      </p>
                    </div>

                    <div className="bg-black/40 p-2 rounded flex items-center gap-2">
                      <MapPin size={16} className="text-blue-400" />
                      <div>
                        <p className="text-gray-400 text-xs">Location</p>
                        <p className="text-xs font-mono">
                          {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AVAILABLE RESPONDERS SECTION */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users size={24} className="text-blue-500" />
            <h2 className="text-2xl font-bold">Available Responders</h2>
            <span className="ml-auto bg-blue-600 px-3 py-1 rounded-full text-sm font-semibold">
              {responders.length}
            </span>
          </div>

          {loadingData && !responders.length ? (
            <div className="text-center py-12 text-gray-400">
              Loading responders...
            </div>
          ) : responders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No available responders currently online.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {responders.map((responder) => (
                <div
                  key={responder.id}
                  className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4 hover:bg-blue-600/20 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-blue-400 flex items-center gap-2">
                        <Users size={16} />
                        {responder.profile?.full_name || 'Unknown Responder'}
                      </h3>
                      <p className="text-sm text-gray-300 mt-1">
                        Phone: {responder.profile?.phone || 'N/A'}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        responder.available
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-600 text-white'
                      }`}
                    >
                      {responder.available ? 'AVAILABLE' : 'BUSY'}
                    </span>
                  </div>

                  <div className="bg-black/40 p-2 rounded flex items-center gap-2 text-sm">
                    <MapPin size={16} className="text-green-400" />
                    <div>
                      <p className="text-gray-400 text-xs">Last Location</p>
                      <p className="text-xs font-mono">
                        {responder.lat.toFixed(4)}, {responder.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    Updated: {new Date(responder.updated_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
