/**
 * Theft API Helper Functions
 * Centralized authentication and utilities for theft API routes
 * Uses singleton Supabase client to prevent multiple instances
 */

import { supabase } from '@/utils/supabaseClient';

/**
 * Get the current authenticated user from the session
 * Uses the singleton Supabase client
 */
export async function getAuthenticatedUser() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      throw new Error('Unauthorized - no session found');
    }

    return session.user;
  } catch (error) {
    console.error('Auth error:', error);
    throw error;
  }
}

/**
 * Get user ID from authenticated session
 */
export async function getUserId(): Promise<string> {
  const user = await getAuthenticatedUser();
  return user.id;
}

/**
 * Get user email from authenticated session
 */
export async function getUserEmail(): Promise<string | undefined> {
  const user = await getAuthenticatedUser();
  return user.email;
}

/**
 * Verify that a contact is authorized (in trusted contacts list and verified)
 */
export async function verifyTrustedContact(
  userId: string,
  contactPhone: string
): Promise<any> {
  // @ts-ignore - new table not in auto-generated types
  const { data: contact, error } = await (supabase as any)
    .from('trusted_contacts')
    .select('*')
    .eq('user_id', userId)
    .eq('contact_phone', contactPhone)
    .eq('verified', true)
    .single();

  if (error || !contact) {
    throw new Error('Contact not authorized');
  }

  return contact;
}

/**
 * Log a theft mode action for audit trail
 */
export async function logTheftAction(
  userId: string,
  action: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    // @ts-ignore - new table not in auto-generated types
    await (supabase as any)
      .from('theft_mode_log')
      .insert({
        user_id: userId,
        action,
        timestamp: new Date().toISOString(),
        ...metadata,
      } as any);
  } catch (err) {
    // Logging errors should not break the main flow
    console.warn('Failed to log action:', err);
  }
}

/**
 * Get all trusted contacts for a user
 */
export async function getTrustedContacts(userId: string): Promise<any[]> {
  // @ts-ignore - new table not in auto-generated types
  const { data, error } = await (supabase as any)
    .from('trusted_contacts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Add a trusted contact
 */
export async function addTrustedContact(
  userId: string,
  contactPhone: string,
  contactName: string
): Promise<any> {
  // @ts-ignore - new table not in auto-generated types
  const { data, error } = await (supabase as any)
    .from('trusted_contacts')
    .insert({
      user_id: userId,
      contact_phone: contactPhone,
      contact_name: contactName,
      verified: false,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Remove a trusted contact
 */
export async function removeTrustedContact(
  userId: string,
  contactId: string
): Promise<boolean> {
  // @ts-ignore - new table not in auto-generated types
  const { error } = await (supabase as any)
    .from('trusted_contacts')
    .delete()
    .eq('id', contactId)
    .eq('user_id', userId);

  if (error) throw error;

  return true;
}

/**
 * Update profile theft status - ONLY updates valid columns
 */
export async function updateTheftStatus(
  userId: string,
  isStolen: boolean
): Promise<any> {
  const updateData: Record<string, any> = {
    is_stolen: isStolen,
  };

  // Only add timestamp if activating (not deactivating)
  if (isStolen) {
    updateData.stolen_activated_at = new Date().toISOString();
  } else {
    updateData.stolen_activated_at = null;
  }

  // @ts-ignore - new columns not in auto-generated types
  const { data, error } = await (supabase as any)
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get theft mode status for a user
 */
export async function getTheftStatus(userId: string): Promise<any> {
  // @ts-ignore - new columns not in auto-generated types
  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('id, is_stolen, stolen_activated_at')
    .eq('id', userId)
    .single();

  if (error) throw error;

  return data
    ? {
        isStolen: data.is_stolen || false,
        activatedAt: data.stolen_activated_at || null,
      }
    : null;
}
