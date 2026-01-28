/**
 * useInvite Hook
 * Manages invite generation, sharing, and user feedback
 */

'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

interface UseInviteReturn {
  loading: boolean;
  error: string | null;
  success: boolean;
  generateInvite: () => Promise<string | null>;
  shareInvite: (inviteLink: string) => Promise<boolean>;
  copyInviteLink: (inviteLink: string) => Promise<boolean>;
}

/**
 * Custom hook for managing invite generation and sharing
 */
export function useInvite(): UseInviteReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const generateInvite = useCallback(async (): Promise<string | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate secure random code
      const randomBytes = new Uint8Array(24);
      crypto.getRandomValues(randomBytes);
      const inviteCode = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 32);

      // Store in database
      const { data: inviteData, error: inviteError } = await supabase
        .from('user_invites')
        .insert({
          inviter_user_id: user.id,
          invite_code: inviteCode,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('invite_code')
        .single();

      if (inviteError) {
        throw new Error(`Failed to create invite: ${inviteError.message}`);
      }

      if (!inviteData?.invite_code) {
        throw new Error('No invite code returned');
      }

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || '';
      const inviteLink = `${baseUrl}/join?code=${inviteData.invite_code}`;

      setSuccess(true);
      return inviteLink;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate invite';
      setError(errorMsg);
      console.error('Generate invite error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const shareInvite = useCallback(async (inviteLink: string): Promise<boolean> => {
    if (!navigator.share) {
      setError('Web Share API not available. Use copy instead.');
      return false;
    }

    try {
      await navigator.share({
        title: 'Join My Safety Circle',
        text: "I'd like to add you to my MiCall safety circle. Click the link to join and be there when I need help.",
        url: inviteLink,
      });

      setSuccess(true);
      return true;
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(`Share failed: ${err.message}`);
        console.error('Share error:', err);
      }
      return false;
    }
  }, []);

  const copyInviteLink = useCallback(async (inviteLink: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setSuccess(true);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to copy link';
      setError(errorMsg);
      console.error('Copy error:', err);
      return false;
    }
  }, []);

  return {
    loading,
    error,
    success,
    generateInvite,
    shareInvite,
    copyInviteLink,
  };
}
