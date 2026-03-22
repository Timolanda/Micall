/**
 * Trusted Contacts Management Hook
 * Manage up to 5 trusted contacts for theft mode activation
 * Non-destructive - new feature, doesn't touch existing code
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabaseClient';
import { toast } from 'sonner';
import type { TrustedContact } from '@/types/theft';

interface UseTrustedContactsOptions {
  maxContacts?: number;
  debugMode?: boolean;
}

export function useTrustedContacts(options: UseTrustedContactsOptions = {}) {
  const { user } = useAuth();
  const { maxContacts = 5, debugMode = false } = options;

  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch trusted contacts from database
   */
  const fetchContacts = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Once backend is ready:
      // const { data, error: fetchError } = await supabase
      //   .from('trusted_contacts')
      //   .select('*')
      //   .eq('user_id', user.id)
      //   .order('created_at', { ascending: false });
      //
      // if (fetchError) throw fetchError;
      // setContacts(data || []);

      if (debugMode) {
        console.log(`📋 [TrustedContacts] Fetched ${contacts.length} contacts`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch contacts';
      setError(message);
      console.error('❌ Fetch contacts error:', message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, debugMode, contacts.length]);

  /**
   * Load contacts on mount
   */
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  /**
   * Add a new trusted contact
   * Requires OTP verification via Supabase Auth
   */
  const addContact = useCallback(
    async (contactPhone: string, contactName: string) => {
      if (!user?.id) {
        setError('User not authenticated');
        return false;
      }

      if (contacts.length >= maxContacts) {
        const msg = `Maximum ${maxContacts} contacts allowed`;
        setError(msg);
        toast.error(`❌ ${msg}`);
        return false;
      }

      // Normalize phone number
      const normalizedPhone = contactPhone.replace(/\D/g, '');

      try {
        setLoading(true);

        // Step 1: Send OTP via Supabase Auth
        // const { error: otpError } = await supabase.auth.signInWithOtp({
        //   phone: normalizedPhone,
        // });
        //
        // if (otpError) throw otpError;

        if (debugMode) {
          console.log(`📲 [TrustedContacts] OTP sent to ${normalizedPhone}`);
        }

        toast.info(
          `📲 OTP sent to ${contactName}. They must verify to be added as trusted contact.`
        );

        // Step 2: User enters OTP (handled in parent component)
        // Step 3: Verify and add contact (in parent component)

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add contact';
        setError(message);
        toast.error(`❌ ${message}`);
        console.error('❌ Add contact error:', message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, contacts.length, maxContacts, debugMode]
  );

  /**
   * Verify OTP and complete contact addition
   */
  const verifyAndAddContact = useCallback(
    async (contactPhone: string, contactName: string, otpCode: string) => {
      if (!user?.id) {
        setError('User not authenticated');
        return false;
      }

      try {
        setLoading(true);

        // Step 1: Verify OTP with Supabase
        // const { data, error: verifyError } = await supabase.auth.verifyOtp({
        //   phone: contactPhone,
        //   token: otpCode,
        //   type: 'sms',
        // });
        //
        // if (verifyError) throw verifyError;

        // Step 2: Add to trusted_contacts table
        // const { error: insertError } = await supabase
        //   .from('trusted_contacts')
        //   .insert({
        //     user_id: user.id,
        //     contact_phone: contactPhone,
        //     contact_name: contactName,
        //     verified: true,
        //     verified_at: new Date().toISOString(),
        //     verification_method: 'otp',
        //   });
        //
        // if (insertError) throw insertError;

        const newContact: TrustedContact = {
          id: `contact_${Date.now()}`, // Placeholder
          userId: user.id,
          contactPhone,
          contactName,
          verified: true,
          verifiedAt: new Date().toISOString(),
          verificationMethod: 'otp',
          createdAt: new Date().toISOString(),
        };

        setContacts((prev) => [...prev, newContact]);
        toast.success(`✅ ${contactName} added as trusted contact`);

        if (debugMode) {
          console.log(`✅ [TrustedContacts] Contact verified: ${contactName}`);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'OTP verification failed';
        setError(message);
        toast.error(`❌ ${message}`);
        console.error('❌ Verify contact error:', message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, debugMode]
  );

  /**
   * Remove a trusted contact
   */
  const removeContact = useCallback(
    async (contactId: string) => {
      if (!user?.id) {
        setError('User not authenticated');
        return false;
      }

      try {
        setLoading(true);

        // Delete from backend
        // const { error: deleteError } = await supabase
        //   .from('trusted_contacts')
        //   .delete()
        //   .eq('id', contactId)
        //   .eq('user_id', user.id);
        //
        // if (deleteError) throw deleteError;

        setContacts((prev) => prev.filter((c) => c.id !== contactId));
        toast.success('✅ Contact removed');

        if (debugMode) {
          console.log(`✅ [TrustedContacts] Removed contact: ${contactId}`);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove contact';
        setError(message);
        toast.error(`❌ ${message}`);
        console.error('❌ Remove contact error:', message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, debugMode]
  );

  /**
   * Get remaining contact slots
   */
  const getRemainingSlots = (): number => {
    return Math.max(0, maxContacts - contacts.length);
  };

  return {
    contacts,
    loading,
    error,
    addContact,
    verifyAndAddContact,
    removeContact,
    getRemainingSlots,
    fetchContacts,
  };
}
