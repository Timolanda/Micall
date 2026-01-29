'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  type EmergencyContact,
} from '@/utils/locationSharingUtils';
import Modal from './Modal';

interface EmergencyContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactsUpdated?: () => void;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  relationship: string;
  can_view_location: boolean;
}

const INITIAL_FORM = {
  name: '',
  phone: '',
  email: '',
  relationship: '',
  can_view_location: true,
};

export default function EmergencyContactModal({
  isOpen,
  onClose,
  onContactsUpdated,
}: EmergencyContactModalProps) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch contacts when modal opens
  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchContacts = async () => {
      try {
        const fetchedContacts = await getEmergencyContacts(user.id);
        setContacts(fetchedContacts);
      } catch (err) {
        console.error('Error fetching contacts:', err);
        setError('Failed to load contacts');
      }
    };

    fetchContacts();
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setIsLoading(true);

    try {
      if (editingId) {
        // Update existing contact
        await updateEmergencyContact(Number(editingId), formData);
      } else {
        // Add new contact
        await addEmergencyContact(user.id, formData);
      }

      // Refresh contacts list
      const updatedContacts = await getEmergencyContacts(user.id);
      setContacts(updatedContacts);

      // Reset form
      setFormData(INITIAL_FORM);
      setEditingId(null);

      onContactsUpdated?.();
    } catch (err) {
      console.error('Error saving contact:', err);
      setError(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (contact: EmergencyContact) => {
    setFormData({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      relationship: contact.relationship || '',
      can_view_location: contact.can_view_location,
    });
    setEditingId(String(contact.id));
  };

  const handleDelete = async (contactId: number) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    setIsLoading(true);
    try {
      await deleteEmergencyContact(contactId);
      const updatedContacts = await getEmergencyContacts(user?.id || '');
      setContacts(updatedContacts);
      onContactsUpdated?.();
    } catch (err) {
      console.error('Error deleting contact:', err);
      setError('Failed to delete contact');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setError(null);
  };

  const handleClose = () => {
    handleCancel();
    onClose();
  };

  const canAddMore = contacts.length < 5;

  if (!isOpen) return null;

  return (
    <Modal onClose={handleClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingId ? 'Edit Contact' : 'Add Emergency Contact'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Contacts List */}
          {contacts.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Your Emergency Contacts ({contacts.length}/5)</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
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
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                          👁️ Can See
                        </span>
                      )}

                      <button
                        onClick={() => handleEdit(contact)}
                        disabled={isLoading}
                        className="p-2 hover:bg-blue-100 rounded-lg transition disabled:opacity-50"
                        title="Edit contact"
                      >
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </button>

                      <button
                        onClick={() => handleDelete(contact.id)}
                        disabled={isLoading}
                        className="p-2 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                        title="Delete contact"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          {canAddMore && (
            <form onSubmit={handleSubmit} className="space-y-4 border-t pt-6">
              <h3 className="font-semibold text-gray-900">
                {editingId ? 'Update Contact' : 'Add New Contact'}
              </h3>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Mom, Best Friend"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g., +1 (555) 123-4567"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g., contact@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Relationship */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship (Optional)
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a relationship</option>
                  <option value="Family">Family</option>
                  <option value="Friend">Friend</option>
                  <option value="Colleague">Colleague</option>
                  <option value="Neighbor">Neighbor</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>

              {/* Location Permission */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  id="location_access"
                  checked={formData.can_view_location}
                  onChange={(e) =>
                    setFormData({ ...formData, can_view_location: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="location_access" className="text-sm text-gray-700">
                  Allow this contact to see my location when sharing is active
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {editingId ? 'Update Contact' : 'Add Contact'}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Max Contacts Message */}
          {!canAddMore && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-900">
                ⚠️ You've reached the maximum of 5 emergency contacts
              </p>
              <p className="text-xs text-amber-800 mt-1">
                Delete a contact to add another one
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
