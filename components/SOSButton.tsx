'use client';
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface SOSButtonProps {
  onSOS?: () => void;
}

export default function SOSButton({ onSOS }: SOSButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSOS = () => {
    setLoading(true);

    // Play alarm sound
    const audio = new Audio('/alarm.mp3');
    audio.play();

    // Vibrate pattern
    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);

    // Call the parent onSOS function
    onSOS?.();

    // Simulate alert sending delay
    setTimeout(() => {
      setLoading(false);
    }, 3000);

    // TODO: Add Supabase location alert logic here
  };

  return (
    <button
      onClick={handleSOS}
      disabled={loading}
      aria-label="Activate SOS"
      className={`w-28 h-28 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all duration-300 
        border-4 focus:outline-none focus:ring-4 focus:ring-red-500/50 
        ${loading ? 'bg-red-400 border-red-400' : 'bg-red-600 border-red-600 hover:bg-red-700'}
      `}
    >
      {loading ? (
        <div className="animate-pulse">Sending...</div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <AlertTriangle size={28} className="animate-bounce" />
          <span>SOS</span>
        </div>
      )}
    </button>
  );
} 