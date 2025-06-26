import { useState } from 'react';

export default function SettingsPage() {
  const [dark, setDark] = useState(true);
  const handleToggle = () => {
    setDark((d) => !d);
    document.documentElement.classList.toggle('dark');
  };
  return (
    <div className="max-w-md mx-auto p-4 flex flex-col gap-6">
      <div className="bg-surface rounded-lg p-4 flex items-center justify-between">
        <span className="font-bold">Dark Mode</span>
        <button onClick={handleToggle} className="bg-zinc-700 text-white px-3 py-1 rounded">
          {dark ? 'On' : 'Off'}
        </button>
      </div>
      <div className="bg-surface rounded-lg p-4 flex items-center justify-between">
        <span className="font-bold">Notifications</span>
        <button className="bg-zinc-700 text-white px-3 py-1 rounded">Configure</button>
      </div>
      <button className="w-full bg-danger text-white py-2 rounded mt-8">Logout</button>
    </div>
  );
} 