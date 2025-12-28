'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  updateContactLocationAccess,
  type EmergencyContact,
} from '@/utils/locationSharingUtils';

interface EmergencyContactManagerProps {
  onClose: () => void;
  onContactsUpdated: () => void;
}

interface ContactForm {
  name: string;
  phone: string;
  email: string;
  relationship: string;
  can_view_location: boolean;
}

const defaultForm: ContactForm = {
  name: '',
  phone: '',
  email: '',
  relationship: '',
  can_view_location: true,
};

export default function EmergencyContactManager({
  onClose,
  onContactsUpdated,
}: EmergencyContactManagerProps) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [form, setForm] = useState<ContactForm>(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Fetch contacts on mount
  useEffect(() => {
    if (!user) return;

    const fetchContacts = async () => {
      const fetchedContacts = await getEmergencyContacts(user.id);
      setContacts(fetchedContacts);
    };

    fetchContacts();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.name || !form.phone) return;

    setIsLoading(true);
    try {
      if (editingId) {
        // Update existing contact
        const updated = await updateEmergencyContact(editingId, form);
        if (updated) {
          setContacts((prev) =>
            prev.map((c) => (c.id === editingId ? updated : c))
          );
        }
      } else {
        // Add new contact
        const added = await addEmergencyContact(user.id, form);
        if (added) {
          setContacts((prev) => [added, ...prev]);
        }
      }

      setForm(defaultForm);
      setEditingId(null);
      setShowForm(false);
      onContactsUpdated();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (contact: EmergencyContact) => {
    setForm({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      relationship: contact.relationship || '',
      can_view_location: contact.can_view_location,
    });
    setEditingId(contact.id);
    setShowForm(true);
  };

  const handleDelete = async (contactId: number) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    setIsLoading(true);
    try {
      const deleted = await deleteEmergencyContact(contactId);
      if (deleted) {
        setContacts((prev) => prev.filter((c) => c.id !== contactId));
        onContactsUpdated();
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLocationAccess = async (contactId: number, currentAccess: boolean) => {
    setIsLoading(true);
    try {
      const success = await updateContactLocationAccess(contactId, !currentAccess);
      if (success) {
        setContacts((prev) =>
          prev.map((c) =>
            c.id === contactId ? { ...c, can_view_location: !currentAccess } : c
          )
        );
        onContactsUpdated();
      }
    } catch (error) {
      console.error('Error toggling location access:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setForm(defaultForm);
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Emergency Contacts</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Add/Edit Form */}
          {showForm && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 space-y-4">
              <h3 className="font-bold text-gray-900">
                {editingId ? 'Edit Contact' : 'Add New Contact'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Emergency contact name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="contact@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Relationship
                  </label>
                  <select
                    value={form.relationship}
                    onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a relationship</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Friend">Friend</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.can_view_location}
                    onChange={(e) =>
                      setForm({ ...form, can_view_location: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Allow to see my location
                  </span>
                </label>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || !form.name || !form.phone}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition"
                  >
                    {editingId ? 'Update Contact' : 'Add Contact'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Contacts List */}
          {contacts.length > 0 ? (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition"
                >
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{contact.name}</p>
                    <p className="text-sm text-gray-600">
                      {contact.relationship || 'Contact'} • {contact.phone}
                    </p>
                    {contact.email && (
                      <p className="text-xs text-gray-500">{contact.email}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Location Access Toggle */}
                    <button
                      onClick={() =>
                        handleToggleLocationAccess(contact.id, contact.can_view_location)
                      }
                      disabled={isLoading}
                      className="p-2 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                      title={
                        contact.can_view_location
                          ? 'Revoke location access'
                          : 'Grant location access'
                      }
                    >
                      {contact.can_view_location ? (
                        <Eye className="w-5 h-5 text-green-600" />
                      ) : (
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleEdit(contact)}
                      disabled={isLoading}
                      className="p-2 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                    >
                      <Edit2 className="w-5 h-5 text-blue-600" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(contact.id)}
                      disabled={isLoading}
                      className="p-2 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : !showForm ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <p className="text-gray-600 font-medium">No emergency contacts yet</p>
              <p className="text-sm text-gray-500 mt-1">Add your first emergency contact</p>
            </div>
          ) : null}

          {/* Add Contact Button (when not showing form) */}
          {!showForm && contacts.length < 5 && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Another Contact
            </button>
          )}

          {contacts.length >= 5 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900">
                ℹ️ You can add up to 5 emergency contacts
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
