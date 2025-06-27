'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import Modal from '../../components/Modal';
import { Pencil, Trash2, PlusCircle, Save, Camera } from 'lucide-react';

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
  const [medicalInfo, setMedicalInfo] = useState('');
  const [savingMedical, setSavingMedical] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState('/user-photo.png');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [medicalSuccess, setMedicalSuccess] = useState(false);

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return setLoading(false);

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .limit(5);
      if (!error && data) setContacts(data);
      setLoading(false);
    };
    fetchContacts();
  }, []);

  useEffect(() => {
    // Fetch profile photo and medical info on mount
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_photo, medical_info')
        .eq('id', userId)
        .single();
      if (profile?.profile_photo) setProfilePhoto(profile.profile_photo);
      if (profile?.medical_info) setMedicalInfo(profile.medical_info);
    })();
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

  const validatePhone = (phone: string) => /^\+?\d{10,15}$/.test(phone);

  const handleSave = async () => {
    if (!name.trim() || !validatePhone(phone)) {
      setError('Valid name and phone (+1234567890) required');
      return;
    }

    if (
      contacts.some(
        (c) => c.phone === phone && (!editingContact || c.id !== editingContact.id)
      )
    ) {
      setError('Phone number already exists');
      return;
    }

    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      setError('User not found');
      setLoading(false);
      return;
    }

    if (editingContact) {
      const { error } = await supabase
        .from('contacts')
        .update({ name, phone })
        .eq('id', editingContact.id);
      if (!error)
        setContacts((prev) =>
          prev.map((c) => (c.id === editingContact.id ? { ...c, name, phone } : c))
        );
    } else {
      if (contacts.length >= 5) {
        setError('Limit of 5 emergency contacts reached');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('contacts')
        .insert([{ name, phone, user_id: userId }])
        .select()
        .single();
      if (!error && data) setContacts([...contacts, data]);
    }

    setLoading(false);
    closeModal();
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id) return;
    setLoading(true);
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (!error) setContacts(contacts.filter((c) => c.id !== id));
    setLoading(false);
  };

  const handleSaveMedicalInfo = async () => {
    setSavingMedical(true);
    setMedicalSuccess(false);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({ medical_info: medicalInfo })
        .eq('id', userId);
      if (!error) {
        setMedicalSuccess(true);
        setTimeout(() => setMedicalSuccess(false), 2000);
      }
    }
    setSavingMedical(false);
  };

  const handleChangePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setPhotoUploading(true);
        setPhotoError(null);
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) {
          setPhotoError('User not found');
          setPhotoUploading(false);
          return;
        }
        // Upload to Supabase Storage
        const filePath = `user-${userId}.jpg`;
        // Remove previous file if exists
        await supabase.storage.from('avatars').remove([filePath]);
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
        if (uploadError) {
          setPhotoError('Upload failed: ' + uploadError.message);
          setPhotoUploading(false);
          return;
        }
        // Get public URL
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const publicUrl = publicUrlData?.publicUrl;
        if (publicUrl) {
          setProfilePhoto(publicUrl);
          // Update profile
          await supabase.from('profiles').update({ profile_photo: publicUrl }).eq('id', userId);
        }
        setPhotoUploading(false);
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 pt-8 pb-20">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">Profile</h1>
          <p className="text-zinc-400">Manage your emergency contacts and information</p>
        </div>

        {/* Profile Photo */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <img
            src={profilePhoto}
            alt="User"
            className="w-32 h-32 rounded-full border-4 border-primary hover:scale-105 transition-all object-cover"
          />
          <button 
            onClick={handleChangePhoto}
            className="text-sm px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-60"
            disabled={photoUploading}
          >
            <Camera size={16} />
            {photoUploading ? 'Uploading...' : 'Change Photo'}
          </button>
          {photoError && <div className="text-red-500 text-sm mt-1">{photoError}</div>}
        </div>

        {/* Emergency Contacts */}
        <div className="bg-zinc-900 rounded-xl p-6 shadow-inner mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Emergency Contacts</h2>
            <button
              className="flex items-center gap-2 text-primary text-sm font-medium disabled:opacity-50 px-3 py-1 rounded-lg hover:bg-primary/10"
              onClick={() => openModal()}
              disabled={contacts.length >= 5}
            >
              <PlusCircle size={18} /> Add Contact
            </button>
          </div>
          <div className="grid gap-4">
            {contacts.map((c) => (
              <div key={c.id} className="bg-zinc-800 p-4 rounded-lg flex justify-between items-center shadow-sm">
                <div>
                  <p className="font-medium text-lg">{c.name}</p>
                  <p className="text-sm text-zinc-400">{c.phone}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openModal(c)} className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-400/10">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {contacts.length === 0 && (
              <div className="text-center py-8 text-zinc-500">
                <p>No emergency contacts added yet</p>
                <p className="text-sm">Add up to 5 contacts for emergency situations</p>
              </div>
            )}
          </div>
        </div>

        {/* Medical Info */}
        <div className="bg-zinc-900 rounded-xl p-6 shadow-inner">
          <h2 className="text-xl font-semibold mb-4">Medical Information</h2>
          <textarea
            className="w-full bg-zinc-800 text-white rounded-lg p-4 resize-none mb-4"
            rows={4}
            placeholder="E.g., diabetic, allergic to penicillin, blood type, medications..."
            value={medicalInfo}
            onChange={(e) => setMedicalInfo(e.target.value)}
          />
          <button
            onClick={handleSaveMedicalInfo}
            disabled={savingMedical}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
          >
            <Save size={16} />
            {savingMedical ? 'Saving...' : 'Save Medical Info'}
          </button>
          {medicalSuccess && <div className="text-green-400 text-sm mt-2">Medical info saved!</div>}
        </div>

        {/* Modal */}
        {showModal && (
          <Modal onClose={closeModal}>
            <div className="bg-zinc-900 p-6 rounded-xl w-full max-w-md space-y-4">
              <h3 className="text-xl font-bold">{editingContact ? 'Edit' : 'Add'} Contact</h3>
              <input
                className="w-full bg-zinc-800 text-white rounded-lg p-3"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="w-full bg-zinc-800 text-white rounded-lg p-3"
                placeholder="Phone (+1234567890)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex justify-end gap-3">
                <button className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600" onClick={closeModal}>Cancel</button>
                <button
                  className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50 hover:bg-primary/90"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {editingContact ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
} 