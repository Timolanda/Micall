/**
 * Trusted Contacts Manager Component
 * Add/manage/remove trusted contacts for theft mode
 * Integrates into Profile → Security section
 */

'use client';

import { useState } from 'react';
import { UserPlus, Trash2, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTrustedContacts } from '@/hooks/useTrustedContacts';

interface TrustedContactsManagerProps {
  onClose?: () => void;
}

export default function TrustedContactsManager({ onClose }: TrustedContactsManagerProps) {
  const { contacts, loading, error, addContact, removeContact, getRemainingSlots } =
    useTrustedContacts();

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOtpPrompt, setShowOtpPrompt] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  /**
   * Handle adding new contact
   */
  const handleAddContact = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('❌ Please enter name and phone number');
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await addContact(formData.phone, formData.name);

      if (success) {
        setShowOtpPrompt(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle removing contact
   */
  const handleRemoveContact = async (contactId: string, contactName: string) => {
    if (!confirm(`Remove ${contactName} as trusted contact?`)) {
      return;
    }

    await removeContact(contactId);
  };

  const remainingSlots = getRemainingSlots();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="text-blue-500" size={24} />
          <h2 className="text-2xl font-bold text-white">Trusted Contacts</h2>
        </div>
        <p className="text-gray-400">
          People who can remotely activate your device recovery system if it's stolen
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="text-red-500 mt-0.5" size={20} />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Current contacts list */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">
          Your Trusted Contacts ({contacts.length}/{5})
        </h3>

        {contacts.length === 0 ? (
          <div className="p-6 bg-gray-800 rounded-lg text-center">
            <Shield className="mx-auto mb-3 text-gray-600" size={32} />
            <p className="text-gray-400">No trusted contacts yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Add up to 5 contacts who can help recover your device
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white">{contact.contactName}</h4>
                    {contact.verified && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded text-green-400 text-xs">
                        <CheckCircle size={14} />
                        Verified
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{contact.contactPhone}</p>
                  {contact.verifiedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Added {new Date(contact.verifiedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleRemoveContact(contact.id, contact.contactName)}
                  className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                  title="Remove contact"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add new contact section */}
      {remainingSlots > 0 && (
        <div>
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus size={20} />
              Add Trusted Contact ({remainingSlots} slots left)
            </button>
          ) : (
            <div className="p-4 bg-gray-800 rounded-lg space-y-4">
              <h3 className="font-semibold text-white">Add New Contact</h3>

              {!showOtpPrompt ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Mom, Best Friend"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleAddContact}
                      disabled={isSubmitting || loading}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      {isSubmitting ? '⏳ Sending OTP...' : '✓ Send Verification Code'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setFormData({ name: '', phone: '' });
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-400">
                      📲 Verification code sent to {formData.name}. They must enter it to confirm.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={6}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // TODO: Verify OTP and add contact
                        toast.info('OTP verification flow - to be implemented with backend');
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      ✓ Verify & Add Contact
                    </button>
                    <button
                      onClick={() => setShowOtpPrompt(false)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      Back
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {remainingSlots === 0 && contacts.length > 0 && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400">
            ⚠️ Maximum 5 trusted contacts reached. Remove one to add another.
          </p>
        </div>
      )}
    </div>
  );
}
