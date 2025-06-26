import { useState } from 'react';

export default function SOSButton() {
  const [loading, setLoading] = useState(false);
  const handleSOS = () => {
    setLoading(true);
    // Play alarm sound
    const audio = new Audio('/alarm.mp3');
    audio.play();
    // Vibrate
    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
    // TODO: Share location, send SMS/WhatsApp alerts via Supabase/Edge Functions
    setTimeout(() => setLoading(false), 3000);
  };
  return (
    <button
      className="w-24 h-24 rounded-full bg-primary shadow-lg flex items-center justify-center text-white text-xl font-bold border-4 border-primary focus:outline-none focus:ring-4 focus:ring-primary/50 mt-4"
      onClick={handleSOS}
      aria-label="SOS"
      disabled={loading}
    >
      {loading ? 'Sending...' : 'SOS'}
    </button>
  );
} 