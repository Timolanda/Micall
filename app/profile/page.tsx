import { useState } from 'react';
// TODO: Import Supabase hooks for fetching/saving profile data

export default function ProfilePage() {
  // Stub data for now
  const [contacts] = useState([
    { name: 'Jane Doe', phone: '+1234567890' },
    { name: 'John Smith', phone: '+1987654321' },
  ]);
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
            <li key={i} className="flex justify-between items-center">
              <span>{c.name}</span>
              <span className="text-sm text-zinc-400">{c.phone}</span>
            </li>
          ))}
        </ul>
        <button className="mt-3 w-full bg-primary text-white py-2 rounded">Add Contact</button>
      </div>
      <div className="bg-surface rounded-lg p-4">
        <h2 className="text-lg font-bold mb-2">Medical Info</h2>
        <textarea className="w-full bg-zinc-800 text-accent rounded p-2" rows={3} placeholder="Allergies, conditions, etc." />
      </div>
    </div>
  );
} 