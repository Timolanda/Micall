import GoLiveButton from '../components/GoLiveButton';
import SOSButton from '../components/SOSButton';
import ResponderMap from '../components/ResponderMap';
import LoadingIndicator from '../components/LoadingIndicator';
import { useState } from 'react';

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const handleGoLive = async () => {
    setLoading(true);
    // Simulate countdown and live start
    setTimeout(() => setLoading(false), 4000);
    // TODO: Integrate Supabase video/live logic
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-8 p-4">
      {loading && <LoadingIndicator label="Starting Live..." />}
      <GoLiveButton onStart={handleGoLive} />
      <SOSButton />
      <div className="w-full max-w-md h-64 rounded-lg overflow-hidden mt-4">
        <ResponderMap />
      </div>
    </div>
  );
} 