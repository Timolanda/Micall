'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import Modal from '@/components/Modal';
import InviteButton from '@/components/InviteButton';
import { Pencil, Trash2, PlusCircle, Save, Camera } from 'lucide-react';

interface Contact {
  id?: string;
  name: string;
  phone: string;
}

export default function ProfilePage() {
  const router = useRouter();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  // Contact modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Profile
  const [profilePhoto, setProfilePhoto] = useState('/user-photo.png');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Medical info
  const [medicalInfo, setMedicalInfo] = useState('');
  const [savingMedical, setSavingMedical] = useState(false);
  const [medicalSuccess, setMedicalSuccess] = useState(false);

  /* ---------------- FETCH DATA ---------------- */

  useEffect(() => {
    const loadProfile = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;

      const [{ data: contactsData }, { data: profile }] = await Promise.all([
        supabase.from('contacts').select('*').eq('user_id', userId).limit(5),
        supabase
          .from('profiles')
          .select('profile_photo, medical_info')
          .eq('id', userId)
          .single(),
      ]);

      if (contactsData) setContacts(contactsData);
      if (profile?.profile_photo) setProfilePhoto(profile.profile_photo);
      if (profile?.medical_info) setMedicalInfo(profile.medical_info);
    };

    loadProfile();
  }, []);

  /* ---------------- CONTACTS ---------------- */

  const openContactModal = (contact?: Contact) => {
    setEditingContact(contact || null);
    setName(contact?.name || '');
    setPhone(contact?.phone || '');
    setError(null);
    setShowContactModal(true);
  };

  const closeContactModal = () => {
    setShowContactModal(false);
    setEditingContact(null);
    setName('');
    setPhone('');
    setError(null);
  };

  const validatePhone = (phone: string) =>
    /^(\+254|0)?7\d{8}$/.test(phone);

  const saveContact = async () => {
    if (!name.trim() || !validatePhone(phone)) {
      setError('Enter a valid Kenyan phone number');
      return;
    }

    if (
      contacts.some(
        (c) => c.phone === phone && c.id !== editingContact?.id
      )
    ) {
      setError('Phone number already exists');
      return;
    }

    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;

    if (!userId) {
      setError('User not found');
      setLoading(false);
      return;
    }

    if (editingContact) {
      await supabase
        .from('contacts')
        .update({ name, phone })
        .eq('id', editingContact.id);

      setContacts((prev) =>
        prev.map((c) =>
          c.id === editingContact.id ? { ...c, name, phone } : c
        )
      );
    } else {
      if (contacts.length >= 5) {
        setError('Maximum of 5 emergency contacts allowed');
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('contacts')
        .insert([{ name, phone, user_id: userId }])
        .select()
        .single();

      if (data) setContacts([...contacts, data]);
    }

    setLoading(false);
    closeContactModal();
  };

  const deleteContact = async (id?: string) => {
    if (!id) return;
    setLoading(true);
    await supabase.from('contacts').delete().eq('id', id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setLoading(false);
  };

  /* ---------------- PROFILE PHOTO ---------------- */

  const changePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setPhotoUploading(true);
      setPhotoError(null);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;

      const path = `user-${userId}.jpg`;
      await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
      });

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      if (data?.publicUrl) {
        setProfilePhoto(data.publicUrl);
        await supabase
          .from('profiles')
          .update({ profile_photo: data.publicUrl })
          .eq('id', userId);
      }

      setPhotoUploading(false);
    };

    input.click();
  };

  /* ---------------- MEDICAL INFO ---------------- */

  const saveMedicalInfo = async () => {
    setSavingMedical(true);
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;

    if (userId) {
      await supabase
        .from('profiles')
        .update({ medical_info: medicalInfo })
        .eq('id', userId);

      setMedicalSuccess(true);
      setTimeout(() => setMedicalSuccess(false), 2000);
    }

    setSavingMedical(false);
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto p-4 pt-8 pb-24">

        {/* Header */}
        <header className="flex justify-between items-start mb-6">
          <div className="text-left">
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-zinc-400">
              Set up emergency contacts & medical info
            </p>
          </div>
          <InviteButton variant="compact" sourceFlow="profile" />
        </header>

        {/* Profile Photo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <Image
            src={profilePhoto}
            alt="Profile"
            width={128}
            height={128}
            unoptimized
            className="w-32 h-32 rounded-full border-4 border-red-600 object-cover"
          />
          <button
            onClick={changePhoto}
            disabled={photoUploading}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 rounded-lg hover:bg-red-500 disabled:opacity-60"
          >
            <Camera size={16} />
            {photoUploading ? 'Uploading...' : 'Change Photo'}
          </button>
          {photoError && <p className="text-red-500 text-sm">{photoError}</p>}
        </div>

        {/* Emergency Contacts */}
        <section className="bg-zinc-900 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Emergency Contacts
              <span className="ml-2 text-sm text-zinc-400">
                {contacts.length}/5
              </span>
            </h2>

            <div className="flex gap-2">
              <button
                onClick={() => openContactModal()}
                disabled={contacts.length >= 5}
                className="flex items-center gap-2 text-red-600 px-3 py-1 rounded-lg hover:bg-red-600/10 disabled:opacity-50"
              >
                <PlusCircle size={18} /> Add
              </button>

              <button
                onClick={() => router.push('/location-sharing')}
                className="flex items-center gap-2 text-red-600 px-3 py-1 rounded-lg hover:bg-red-600/10"
              >
                📍 Location Sharing
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="bg-zinc-800 p-4 rounded-lg flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-zinc-400">{c.phone}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openContactModal(c)}
                    className="text-red-400 hover:bg-red-400/10 p-2 rounded-lg"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => deleteContact(c.id)}
                    disabled={loading}
                    className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}

            {contacts.length === 0 && (
              <p className="text-center text-zinc-500 py-6">
                No emergency contacts added
              </p>
            )}
          </div>
        </section>

        {/* Medical Info */}
        <section className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Medical Information</h2>

          <textarea
            rows={4}
            className="w-full bg-zinc-800 rounded-lg p-4 mb-4"
            placeholder="Allergies, conditions, medications..."
            value={medicalInfo}
            onChange={(e) => setMedicalInfo(e.target.value)}
          />

          <button
            onClick={saveMedicalInfo}
            disabled={savingMedical}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 rounded-lg hover:bg-red-500 disabled:opacity-50"
          >
            <Save size={16} />
            {savingMedical ? 'Saving...' : 'Save Medical Info'}
          </button>

          {medicalSuccess && (
            <p className="text-green-400 text-sm mt-2">
              Medical info saved
            </p>
          )}
        </section>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <Modal onClose={closeContactModal}>
          <div className="bg-zinc-900 p-6 rounded-xl w-full max-w-md space-y-4">
            <h3 className="text-xl font-bold">
              {editingContact ? 'Edit Contact' : 'Add Contact'}
            </h3>

            <input
              className="w-full bg-zinc-800 rounded-lg p-3"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="w-full bg-zinc-800 rounded-lg p-3"
              placeholder="Phone (07XXXXXXXX)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex justify-end gap-3">
              <button
                onClick={closeContactModal}
                className="px-4 py-2 bg-zinc-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveContact}
                disabled={loading}
                className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-500 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
