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
  const { data: contact, error } = await supabase
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
  action: 'theft_mode_triggered' | 'theft_mode_disabled',
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    // @ts-ignore - new table not in auto-generated types
    await supabase
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
  const { data, error } = await supabase
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
 * Get a specific trusted contact
 */
export async function getTrustedContact(
  userId: string,
  contactId: string
): Promise<any> {
  // @ts-ignore - new table not in auto-generated types
  const { data, error } = await supabase
    .from('trusted_contacts')
    .select('*')
    .eq('id', contactId)
    .eq('user_id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update profile theft status
 */
export async function updateTheftStatus(
  userId: string,
  isStolen: boolean,
  activatedAt?: string
): Promise<any> {
  const updateData: any = {
    is_stolen: isStolen,
    stolen_activated_at: isStolen ? activatedAt || new Date().toISOString() : null,
  };

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
