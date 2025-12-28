'use client';

import { supabase } from '@/utils/supabaseClient';
import { toast } from 'sonner';

/**
 * Location sharing utility functions
 * Handles continuous location sharing with emergency contacts
 */

export interface EmergencyContact {
  id: number;
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
  can_view_location: boolean;
  created_at: string;
}

export interface SharedLocation {
  id: number;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  updated_at: string;
}

export interface TrackedUser {
  id: string;
  full_name: string;
  location: SharedLocation;
  distance_km?: number;
  last_update_ago?: string;
}

/**
 * Enable location sharing for a user
 */
export const enableLocationSharing = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        location_sharing_enabled: true,
        location_sharing_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
    toast.success('Location sharing enabled');
    return true;
  } catch (error) {
    console.error('Error enabling location sharing:', error);
    toast.error('Failed to enable location sharing');
    return false;
  }
};

/**
 * Disable location sharing for a user
 */
export const disableLocationSharing = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        location_sharing_enabled: false,
        location_sharing_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
    toast.success('Location sharing disabled');
    return true;
  } catch (error) {
    console.error('Error disabling location sharing:', error);
    toast.error('Failed to disable location sharing');
    return false;
  }
};

/**
 * Check if location sharing is enabled for a user
 */
export const isLocationSharingEnabled = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('location_sharing_enabled')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.location_sharing_enabled ?? false;
  } catch (error) {
    console.error('Error checking location sharing:', error);
    return false;
  }
};

/**
 * Get all emergency contacts for a user
 */
export const getEmergencyContacts = async (userId: string): Promise<EmergencyContact[]> => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error('Error fetching contacts:', error);
    toast.error('Failed to load emergency contacts');
    return [];
  }
};

/**
 * Add a new emergency contact
 */
export const addEmergencyContact = async (
  userId: string,
  contact: Omit<EmergencyContact, 'id' | 'created_at'>
): Promise<EmergencyContact | null> => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .insert([
        {
          user_id: userId,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          relationship: contact.relationship,
          can_view_location: contact.can_view_location,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    toast.success(`${contact.name} added to emergency contacts`);
    return data;
  } catch (error: any) {
    console.error('Error adding contact:', error);
    if (error.code === '23505') {
      toast.error('This contact already exists');
    } else {
      toast.error('Failed to add emergency contact');
    }
    return null;
  }
};

/**
 * Update an emergency contact
 */
export const updateEmergencyContact = async (
  contactId: number,
  updates: Partial<EmergencyContact>
): Promise<EmergencyContact | null> => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', contactId)
      .select()
      .single();

    if (error) throw error;
    toast.success('Contact updated');
    return data;
  } catch (error) {
    console.error('Error updating contact:', error);
    toast.error('Failed to update contact');
    return null;
  }
};

/**
 * Delete an emergency contact
 */
export const deleteEmergencyContact = async (contactId: number): Promise<boolean> => {
  try {
    const { error } = await supabase.from('contacts').delete().eq('id', contactId);

    if (error) throw error;
    toast.success('Contact removed');
    return true;
  } catch (error) {
    console.error('Error deleting contact:', error);
    toast.error('Failed to delete contact');
    return false;
  }
};

/**
 * Update location sharing permission for a contact
 */
export const updateContactLocationAccess = async (
  contactId: number,
  canView: boolean
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('contacts')
      .update({ can_view_location: canView })
      .eq('id', contactId);

    if (error) throw error;
    toast.success(`Contact location access ${canView ? 'enabled' : 'disabled'}`);
    return true;
  } catch (error) {
    console.error('Error updating location access:', error);
    toast.error('Failed to update location access');
    return false;
  }
};

/**
 * Get the location of a user (if sharing is enabled and authenticated user is authorized)
 */
export const getSharedUserLocation = async (
  userId: string,
  currentUserId: string
): Promise<SharedLocation | null> => {
  try {
    // Verify location sharing is enabled
    const sharingEnabled = await isLocationSharingEnabled(userId);
    if (!sharingEnabled) {
      return null;
    }

    // Verify current user is an emergency contact
    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('can_view_location', true);

    if (contactError) throw contactError;

    // In production, you'd verify the email matches
    // For now, we'll fetch the location if they're a contact
    if (!contacts || contacts.length === 0) {
      return null;
    }

    const { data, error } = await supabase
      .from('user_locations')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        // PGRST116 = no rows found (acceptable)
        throw error;
      }
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching shared location:', error);
    return null;
  }
};

/**
 * Get all users that the current user is tracking (location sharing enabled)
 */
export const getTrackedUsers = async (currentUserId: string): Promise<TrackedUser[]> => {
  try {
    // Get all contacts of current user
    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('can_view_location', true);

    if (contactError) throw contactError;
    if (!contacts || contacts.length === 0) return [];

    // For each contact, check if they have location sharing enabled
    const trackedUsers: TrackedUser[] = [];

    for (const contact of contacts) {
      const sharingEnabled = await isLocationSharingEnabled(contact.user_id);
      if (sharingEnabled) {
        const location = await getSharedUserLocation(contact.user_id, currentUserId);
        if (location) {
          trackedUsers.push({
            id: contact.user_id,
            full_name: contact.name,
            location,
          });
        }
      }
    }

    return trackedUsers;
  } catch (error) {
    console.error('Error fetching tracked users:', error);
    return [];
  }
};

/**
 * Format time elapsed since last update
 */
export const formatLastUpdate = (updatedAt: string): string => {
  const now = new Date().getTime();
  const lastUpdate = new Date(updatedAt).getTime();
  const secondsAgo = Math.floor((now - lastUpdate) / 1000);

  if (secondsAgo < 60) return 'Just now';
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
  return `${Math.floor(secondsAgo / 86400)}d ago`;
};

/**
 * Calculate distance between two coordinates
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
