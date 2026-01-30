'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useAdminContext } from '@/hooks/useAdminContext';
import { supabase } from '@/utils/supabaseClient';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  Clock,
  TrendingUp,
  MapPin,
  Zap,
  Users,
  RefreshCw,
  Phone,
  Mail,
} from 'lucide-react';
import LoadingIndicator from '@/components/LoadingIndicator';
import type { AdminAlertRecord, InstitutionType } from '@/types/admin';

const INSTITUTION_ICONS: Record<InstitutionType, string> = {
  police: '👮',
  hospital: '🏥',
  fire_department: '🚒',
  ambulance_service: '🚑',
  government_agency: '🏛️',
  ngo: '🤝',
  other: '📋',
};

export default function SecondaryAdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { adminProfile, adminStats, isSecondaryAdmin, loading: contextLoading } = useAdminContext();

  const [recentAlerts, setRecentAlerts] = useState<AdminAlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check access
  useEffect(() => {
    if (authLoading || contextLoading) return;

    if (!user) {
      router.replace('/landing');
      return;
    }

    if (!isSecondaryAdmin) {
      console.error('❌ Access denied - not a secondary admin');
      toast.error('Access denied. Secondary admin status required.');
      router.replace('/');
      return;
    }
  }, [user, authLoading, contextLoading, isSecondaryAdmin, router]);

  // Fetch recent alerts
  const fetchRecentAlerts = async () => {
    try {
      setRefreshing(true);

      const { data, error } = await supabase
        .from('emergency_alerts')
        .select(`
          id,
          type,
          status,
          lat,
          lng,
          created_at,
          updated_at,
          user:profiles (
            full_name,
            phone
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setRecentAlerts(
        data?.map((alert: any) => ({
          id: alert.id,
          type: alert.type,
          status: alert.status,
          location: {
            lat: alert.lat || 0,
            lng: alert.lng || 0,
          },
          created_at: alert.created_at,
          updated_at: alert.updated_at,
          user: alert.user
            ? {
                full_name: (alert.user as any)?.full_name || 'Unknown',
                phone: (alert.user as any)?.phone || 'N/A',
              }
            : undefined,
        })) || []
      );
    } catch (error) {
      console.error('Fetch alerts error:', error);
      toast.error('Failed to fetch recent alerts');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isSecondaryAdmin) return;
    setLoading(false);
    fetchRecentAlerts();
  }, [isSecondaryAdmin]);

  if (loading || contextLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingIndicator label="Loading dashboard..." />
      </div>
    );
  }

  if (!adminProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-accent/30 mb-4" />
          <p className="text-accent">No admin profile found</p>
        </div>
      </div>
    );
  }

  const getEmergencyTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      fire: 'from-red-500/10 to-red-500/5 text-red-400 border-red-500/20',
      medical: 'from-blue-500/10 to-blue-500/5 text-blue-400 border-blue-500/20',
      accident: 'from-yellow-500/10 to-yellow-500/5 text-yellow-400 border-yellow-500/20',
      drowning: 'from-cyan-500/10 to-cyan-500/5 text-cyan-400 border-cyan-500/20',
      violence: 'from-purple-500/10 to-purple-500/5 text-purple-400 border-purple-500/20',
      disaster: 'from-orange-500/10 to-orange-500/5 text-orange-400 border-orange-500/20',
      search_rescue: 'from-green-500/10 to-green-500/5 text-green-400 border-green-500/20',
      hazmat: 'from-indigo-500/10 to-indigo-500/5 text-indigo-400 border-indigo-500/20',
    };
    return colors[type] || 'from-surface-secondary to-surface-secondary text-accent border-surface-secondary';
  };

  const institutionType = adminProfile.institution?.type as InstitutionType || 'other';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 pt-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-accent hover:text-primary transition mb-6"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/20 rounded-lg flex items-center justify-center text-4xl">
                {INSTITUTION_ICONS[institutionType]}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-primary">
                  {adminProfile.institution?.name}
                </h1>
                <p className="text-accent text-sm">
                  {adminProfile.status === 'verified' && '✅ Verified Secondary Admin'}
                  {adminProfile.status === 'pending_verification' && '⏳ Pending Verification'}
                  {adminProfile.status === 'suspended' && '⏸️ Account Suspended'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setRefreshing(true);
                fetchRecentAlerts();
              }}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition disabled:opacity-50"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Institution Details Card */}
        <div className="bg-surface-secondary rounded-lg p-6 border border-surface-secondary/50 mb-8">
          <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Shield size={20} />
            Institution Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-accent text-sm mb-1">Type</p>
              <p className="text-primary font-medium">
                {adminProfile.institution?.type.replace(/_/g, ' ')}
              </p>
            </div>

            <div>
              <p className="text-accent text-sm mb-1">License/ID</p>
              <p className="text-primary font-medium">{adminProfile.institution?.identifier}</p>
            </div>

            <div>
              <p className="text-accent text-sm mb-1">Jurisdiction</p>
              <p className="text-primary font-medium flex items-center gap-2">
                <MapPin size={14} />
                {adminProfile.institution?.jurisdiction_area}
              </p>
            </div>

            <div>
              <p className="text-accent text-sm mb-1">Verified Date</p>
              <p className="text-primary font-medium">
                {adminProfile.verified_at
                  ? new Date(adminProfile.verified_at).toLocaleDateString()
                  : 'Pending'}
              </p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="mt-6 pt-6 border-t border-surface-secondary/30">
            <h3 className="text-sm font-semibold text-accent mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminProfile.institution?.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-accent" />
                  <a
                    href={`tel:${adminProfile.institution.phone}`}
                    className="text-primary hover:text-accent transition"
                  >
                    {adminProfile.institution.phone}
                  </a>
                </div>
              )}
              {adminProfile.institution?.email && (
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-accent" />
                  <a
                    href={`mailto:${adminProfile.institution.email}`}
                    className="text-primary hover:text-accent transition"
                  >
                    {adminProfile.institution.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        {adminStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg p-6 border border-green-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-accent text-sm mb-1">Total Alerts Handled</p>
                  <p className="text-3xl font-bold text-green-400">
                    {adminStats.total_alerts_handled}
                  </p>
                </div>
                <TrendingUp className="text-green-400 opacity-50" size={32} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg p-6 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-accent text-sm mb-1">Active Emergencies</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {adminStats.active_emergencies}
                  </p>
                </div>
                <AlertTriangle className="text-blue-400 opacity-50" size={32} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg p-6 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-accent text-sm mb-1">Avg Response Time</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {Math.round(adminStats.average_response_time / 60)}
                    <span className="text-lg font-normal">m</span>
                  </p>
                </div>
                <Clock className="text-purple-400 opacity-50" size={32} />
              </div>
            </div>
          </div>
        )}

        {/* Emergency Types */}
        <div className="bg-surface-secondary rounded-lg p-6 border border-surface-secondary/50 mb-8">
          <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Zap size={20} />
            Emergency Types Handled
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {adminProfile.emergency_types.length > 0 ? (
              adminProfile.emergency_types.map(type => (
                <div
                  key={type}
                  className={`px-4 py-3 rounded-lg border bg-gradient-to-r text-sm font-medium ${getEmergencyTypeColor(
                    type
                  )}`}
                >
                  {type.replace(/_/g, ' ')}
                </div>
              ))
            ) : (
              <p className="text-accent col-span-full">No emergency types assigned</p>
            )}
          </div>
        </div>

        {/* Recent Active Alerts */}
        <div className="bg-surface-secondary rounded-lg p-6 border border-surface-secondary/50">
          <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <AlertTriangle size={20} />
            Recent Active Alerts
          </h2>

          {recentAlerts.length === 0 ? (
            <div className="text-center py-8">
              <Users size={32} className="mx-auto text-accent/30 mb-2" />
              <p className="text-accent">No active alerts at this time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="bg-background rounded-lg p-4 border border-surface-secondary/50 hover:border-accent/30 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-primary">{alert.type}</h3>
                      <p className="text-accent text-sm">
                        ID: {alert.id} • Status: {alert.status}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30">
                      <Zap size={12} />
                      Active
                    </div>
                  </div>

                  {/* Alert Details */}
                  <div className="bg-surface-secondary rounded p-3 mb-3 space-y-2">
                    {alert.user && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-accent">Reported By:</span>
                          <span className="text-primary font-medium">{alert.user.full_name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-accent">Contact:</span>
                          <span className="text-primary font-medium">{alert.user.phone}</span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-accent">Location:</span>
                      <span className="text-primary font-medium flex items-center gap-1">
                        <MapPin size={12} />
                        {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-accent">Reported:</span>
                      <span className="text-primary font-medium">
                        {new Date(alert.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Respond Button */}
                  <button className="w-full px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition font-medium">
                    View & Respond →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
