import { useState } from 'react';

export default function GoLiveButton({ onStart }: { onStart: () => void }) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const handleClick = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c === 1) {
          clearInterval(interval);
          onStart();
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return null;
        }
        return c! - 1;
      });
    }, 1000);
  };
  return (
    <button
      className="w-32 h-32 rounded-full bg-danger shadow-lg flex items-center justify-center text-white text-2xl animate-pulse-glow border-4 border-danger focus:outline-none focus:ring-4 focus:ring-danger/50"
      onClick={handleClick}
      aria-label="Go Live"
    >
      {countdown !== null ? countdown : "Go Live"}
    </button>
  );
} 