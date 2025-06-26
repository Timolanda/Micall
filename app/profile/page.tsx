'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import Modal from '../../components/Modal';

interface Contact {
  id?: string;
  name: string;
  phone: string;
}

export default function ProfilePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch contacts from Supabase
  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      const user = supabase.auth.getUser();
      // Replace with actual user ID logic
      const userId = (await user).data.user?.id;
      if (!userId) return setLoading(false);
      const { data, error } = await supabase.from('contacts').select('*').eq('user_id', userId).limit(5);
      if (!error && data) setContacts(data);
      setLoading(false);
    };
    fetchContacts();
  }, []);

  const openModal = (contact?: Contact) => {
    setEditingContact(contact || null);
    setName(contact?.name || '');
    setPhone(contact?.phone || '');
    setError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingContact(null);
    setName('');
    setPhone('');
    setError(null);
  };

  const validatePhone = (phone: string) => {
    return /^\+?\d{10,15}$/.test(phone);
  };

  const handleSave = async () => {
    if (!name.trim() || !validatePhone(phone)) {
      setError('Enter a valid name and phone number (10-15 digits, may start with +)');
      return;
    }
    if (contacts.some(c => c.phone === phone && (!editingContact || c.id !== editingContact.id))) {
      setError('This phone number is already in your contacts.');
      return;
    }
    setLoading(true);
    const user = supabase.auth.getUser();
    const userId = (await user).data.user?.id;
    if (!userId) {
      setError('User not found.');
      setLoading(false);
      return;
    }
    if (editingContact) {
      // Update contact
      const { data, error } = await supabase.from('contacts').update({ name, phone }).eq('id', editingContact.id);
      if (!error) setContacts(contacts.map(c => c.id === editingContact.id ? { ...c, name, phone } : c));
    } else {
      // Add new contact
      if (contacts.length >= 5) {
        setError('You can only have up to 5 emergency contacts.');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.from('contacts').insert([{ name, phone, user_id: userId }]).select().single();
      if (!error && data) setContacts([...contacts, data]);
    }
    setLoading(false);
    closeModal();
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id) return;
    setLoading(true);
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (!error) setContacts(contacts.filter(c => c.id !== id));
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-4 flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <img src="/user-photo.png" alt="User Photo" className="w-24 h-24 rounded-full border-4 border-primary" />
        <button className="mt-2 px-4 py-1 bg-primary text-white rounded">Change Photo</button>
      </div>
      <div className="bg-surface rounded-lg p-4">
        <h2 className="text-lg font-bold mb-2">Emergency Contacts</h2>
        <ul className="space-y-2">
          {contacts.map((c, i) => (
            <li key={c.id || i} className="flex justify-between items-center">
              <span>{c.name}</span>
              <span className="text-sm text-zinc-400">{c.phone}</span>
              <div className="flex gap-2">
                <button className="text-blue-500" onClick={() => openModal(c)}>Edit</button>
                <button className="text-red-500" onClick={() => handleDelete(c.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
        <button className="mt-3 w-full bg-primary text-white py-2 rounded" onClick={() => openModal()} disabled={contacts.length >= 5}>Add Contact</button>
      </div>
      <div className="bg-surface rounded-lg p-4">
        <h2 className="text-lg font-bold mb-2">Medical Info</h2>
        <textarea className="w-full bg-zinc-800 text-accent rounded p-2" rows={3} placeholder="Allergies, conditions, etc." />
      </div>
      {showModal && (
        <Modal>
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold mb-2">{editingContact ? 'Edit' : 'Add'} Contact</h3>
            <input
              className="bg-zinc-800 text-accent rounded p-2"
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <input
              className="bg-zinc-800 text-accent rounded p-2"
              placeholder="Phone (+1234567890)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-1 bg-zinc-700 text-white rounded" onClick={closeModal}>Cancel</button>
              <button className="px-4 py-1 bg-primary text-white rounded" onClick={handleSave} disabled={loading}>{editingContact ? 'Save' : 'Add'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
} 