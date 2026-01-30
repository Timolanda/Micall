'use client';

import { useState, useEffect, useCallback, useContext, createContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabaseClient';
import type { AdminProfile, AdminStats } from '@/types/admin';

/**
 * Admin context type
 */
interface AdminContextType {
  adminProfile: AdminProfile | null;
  adminStats: AdminStats | null;
  isSecondaryAdmin: boolean;
  isPlatformAdmin: boolean;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

/**
 * Create the admin context
 */
const AdminContext = createContext<AdminContextType | undefined>(undefined);

/**
 * Admin Context Provider component
 */
export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [isSecondaryAdmin, setIsSecondaryAdmin] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch admin profile from database
   */
  const fetchAdminProfile = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is platform admin (owner)
      const ownerEmail = 'timolanda@gmail.com';
      if (user?.email?.toLowerCase().trim() === ownerEmail.toLowerCase().trim()) {
        setIsPlatformAdmin(true);
        setLoading(false);
        return;
      }

      // Fetch admin profile
      const { data, error: fetchError } = await supabase
        .from('admin_profiles')
        .select(`
          *,
          institution:institutions (
            id,
            name,
            type,
            identifier,
            jurisdiction_area,
            address,
            phone,
            email
          )
        `)
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No admin profile found
          setAdminProfile(null);
          setIsSecondaryAdmin(false);
        } else {
          throw fetchError;
        }
      } else if (data) {
        setAdminProfile(data as AdminProfile);
        setIsSecondaryAdmin(data.status === 'verified');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch admin profile';
      console.error('Admin profile fetch error:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  /**
   * Fetch admin statistics
   */
  const fetchAdminStats = useCallback(async (adminId: string) => {
    try {
      // Fetch stats from admin_stats table or compute from alerts
      const { data, error: fetchError } = await supabase
        .from('admin_stats')
        .select('*')
        .eq('admin_id', adminId)
        .single();

      if (fetchError) {
        if (fetchError.code !== 'PGRST116') {
          throw fetchError;
        }
      } else if (data) {
        setAdminStats({
          total_alerts_handled: data.total_alerts_handled || 0,
          active_emergencies: data.active_emergencies || 0,
          average_response_time: data.average_response_time || 0,
          verified_at: data.verified_at,
          institution_type: data.institution_type,
          emergency_types: data.emergency_types || [],
        });
      }
    } catch (err) {
      console.error('Admin stats fetch error:', err);
    }
  }, []);

  /**
   * Initialize admin data when user changes
   */
  useEffect(() => {
    if (!user?.id) {
      setAdminProfile(null);
      setAdminStats(null);
      setIsSecondaryAdmin(false);
      setLoading(false);
      return;
    }

    fetchAdminProfile(user.id);
  }, [user?.id, fetchAdminProfile]);

  /**
   * Refresh admin profile
   */
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchAdminProfile(user.id);
    }
  }, [user?.id, fetchAdminProfile]);

  /**
   * Refresh admin stats
   */
  const refreshStats = useCallback(async () => {
    if (adminProfile?.id) {
      await fetchAdminStats(adminProfile.id);
    }
  }, [adminProfile?.id, fetchAdminStats]);

  const value: AdminContextType = {
    adminProfile,
    adminStats,
    isSecondaryAdmin,
    isPlatformAdmin,
    loading,
    error,
    refreshProfile,
    refreshStats,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

/**
 * Hook to use admin context
 */
export function useAdminContext() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminContext must be used within AdminProvider');
  }
  return context;
}

/**
 * Hook to fetch verification requests (for platform admin)
 */
export function usePendingVerifications() {
  interface VerificationRequest {
    id: string;
    user_id: string;
    institution_id: string;
    status: string;
    emergency_types: string[];
    created_at: string;
    updated_at: string;
    institution?: {
      id: string;
      name: string;
      type: string;
      identifier: string;
      jurisdiction_area: string;
    };
    verification_documents?: {
      id: string;
      document_type: string;
      file_url: string;
      file_name: string;
    }[];
  }

  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async (status?: string) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('admin_profiles')
        .select(`
          id,
          user_id,
          institution_id,
          status,
          emergency_types,
          created_at,
          updated_at,
          institution:institutions (
            id,
            name,
            type,
            identifier,
            jurisdiction_area
          ),
          verification_documents (
            id,
            document_type,
            file_url,
            file_name
          )
        `);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setRequests((data || []) as any);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch requests';
      console.error('Fetch verification requests error:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { requests, loading, error, fetchRequests };
}
