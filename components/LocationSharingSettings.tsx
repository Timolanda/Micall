'use client';

import { useState, useEffect } from 'react';
import { MapPin, Users, ToggleRight, ToggleLeft, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  isLocationSharingEnabled,
  getEmergencyContacts,
  enableLocationSharing,
  disableLocationSharing,
  type EmergencyContact,
} from '@/utils/locationSharingUtils';
import EmergencyContactManager from './EmergencyContactManager';

interface LocationSharingSettingsProps {
  onContactsChange?: () => void;
  onOpenContactModal?: () => void;
}

export default function LocationSharingSettings({
  onContactsChange,
  onOpenContactModal,
}: LocationSharingSettingsProps) {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [showContactManager, setShowContactManager] = useState(false);

  // Fetch initial state
  useEffect(() => {
    if (!user) return;

    const fetchState = async () => {
      setIsLoading(true);
      try {
        const enabled = await isLocationSharingEnabled(user.id);
        setIsEnabled(enabled);

        const fetchedContacts = await getEmergencyContacts(user.id);
        setContacts(fetchedContacts);
      } catch (error) {
        console.error('Error fetching location sharing state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchState();
  }, [user]);

  const handleToggle = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      if (isEnabled) {
        await disableLocationSharing(user.id);
        setIsEnabled(false);
      } else {
        await enableLocationSharing(user.id);
        setIsEnabled(true);
      }
    } catch (error) {
      console.error('Error toggling location sharing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactsUpdated = async () => {
    if (!user) return;
    const fetchedContacts = await getEmergencyContacts(user.id);
    setContacts(fetchedContacts);
    onContactsChange?.();
  };

  const activeContacts = contacts.filter((c) => c.can_view_location).length;

  return (
    <div className="space-y-6">
      {/* Main Location Sharing Toggle */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Location Sharing</h3>
              <p className="text-sm text-gray-500">
                Share your location with emergency contacts 24/7
              </p>
            </div>
          </div>

          <button
            onClick={handleToggle}
            disabled={isLoading}
            className="transition disabled:opacity-50"
          >
            {isEnabled ? (
              <ToggleRight className="w-10 h-10 text-green-600" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-gray-400" />
            )}
          </button>
        </div>

        {/* Status Indicator */}
        <div
          className={`rounded-lg p-3 flex items-center gap-3 ${
            isEnabled
              ? 'bg-green-50 border border-green-200'
              : 'bg-gray-50 border border-gray-200'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-green-600' : 'bg-gray-400'}`}
          />
          <p className={`text-sm font-medium ${isEnabled ? 'text-green-700' : 'text-gray-600'}`}>
            {isEnabled
              ? '✅ Location sharing is active - Your emergency contacts can see your location'
              : '⭕ Location sharing is disabled'}
          </p>
        </div>
      </div>

      {/* Emergency Contacts Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Emergency Contacts</h3>
              <p className="text-sm text-gray-500">
                {activeContacts} of {contacts.length} contacts with location access
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenContactModal ? onOpenContactModal() : setShowContactManager(true)}
            disabled={contacts.length >= 5}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>

        {/* Contacts List */}
        {contacts.length > 0 ? (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
              >
                <div>
                  <p className="font-medium text-gray-900">{contact.name}</p>
                  <p className="text-xs text-gray-500">
                    {contact.relationship || 'Emergency Contact'} • {contact.phone}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {contact.can_view_location && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      👁️ Can See Location
                    </span>
                  )}

                  <button
                    onClick={() => setShowContactManager(true)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition"
                  >
                    ⚙️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
            <p className="text-gray-600 font-medium">No emergency contacts yet</p>
            <p className="text-sm text-gray-500 mt-1">Add up to 5 emergency contacts</p>
          </div>
        )}

        {/* Info Box */}
        {contacts.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-900 font-medium">📍 Privacy:</p>
            <p className="text-sm text-purple-800 mt-2">
              Only contacts marked with &quot;Can See Location&quot; will be able to track your location
              when location sharing is enabled.
            </p>
          </div>
        )}
      </div>

      {/* Contact Manager Modal */}
      {showContactManager && (
        <EmergencyContactManager
          onClose={() => setShowContactManager(false)}
          onContactsUpdated={handleContactsUpdated}
        />
      )}
    </div>
  );
}
