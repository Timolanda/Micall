'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Maximize2, AlertTriangle, Phone, MapPin, CheckCircle, Navigation, Clock } from 'lucide-react';

interface LiveVideoPlayerProps {
  alertId: number;
  videoUrl?: string;
  isLive?: boolean;
  userLocation?: { latitude: number; longitude: number };
  onAccept?: () => void;
  onReject?: () => void;
  onStatusChange?: (status: 'available' | 'en-route' | 'on-scene' | 'complete') => void;
  responderCount?: number;
  elapsedTime?: number;
}

export default function LiveVideoPlayer({
  alertId,
  videoUrl,
  isLive = false,
  userLocation,
  onAccept,
  onReject,
  onStatusChange,
  responderCount = 0,
  elapsedTime = 0,
}: LiveVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [responderStatus, setResponderStatus] = useState<'available' | 'en-route' | 'on-scene' | 'complete'>('available');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [formattedTime, setFormattedTime] = useState('0:00');

  // Format elapsed time
  useEffect(() => {
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    setFormattedTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  }, [elapsedTime]);

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().then(() => {
          setIsFullscreen(true);
        });
      } else {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        });
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleStatusChange = (newStatus: 'available' | 'en-route' | 'on-scene' | 'complete') => {
    setResponderStatus(newStatus);
    onStatusChange?.(newStatus);
    setShowStatusMenu(false);
  };

  const getStatusColor = () => {
    switch (responderStatus) {
      case 'en-route':
        return 'bg-blue-600';
      case 'on-scene':
        return 'bg-green-600';
      case 'complete':
        return 'bg-purple-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusLabel = () => {
    switch (responderStatus) {
      case 'en-route':
        return 'En Route';
      case 'on-scene':
        return 'On Scene';
      case 'complete':
        return 'Complete';
      default:
        return 'Available';
    }
  };

  return (
    <div ref={containerRef} className="bg-black rounded-lg overflow-hidden shadow-lg relative">
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="w-full h-auto bg-black"
          poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23000' width='100' height='100'/%3E%3C/svg%3E"
          onVolumeChange={(e) => {
            const video = e.currentTarget;
            setIsMuted(video.muted || video.volume === 0);
          }}
        />
      ) : (
        <div className="w-full h-64 bg-gray-900 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
          <p className="text-gray-400 text-lg">No video available</p>
          <p className="text-gray-500 text-sm mt-2">Waiting for emergency video feed...</p>
        </div>
      )}

      {isLive && (
        <>
          {/* Top Left: Live Badge + Time */}
          <div className="absolute top-4 left-4 flex gap-2">
            <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
            <div className="bg-black/60 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 shadow-lg">
              <Clock className="w-4 h-4" />
              {formattedTime}
            </div>
          </div>

          {/* Top Right: Location + Responders */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {userLocation && (
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                <MapPin className="w-3 h-3" />
                {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </div>
            )}
            {responderCount > 0 && (
              <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                👥 {responderCount} viewing
              </div>
            )}
          </div>

          {/* Bottom Left: Responder Status Menu */}
          <div className="absolute bottom-4 left-4 relative">
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`px-4 py-2 rounded-lg text-white font-semibold flex items-center gap-2 shadow-lg transition ${getStatusColor()} hover:opacity-90`}
              >
                <Navigation className="w-4 h-4" />
                {getStatusLabel()}
              </button>

              {/* Status dropdown menu */}
              {showStatusMenu && (
                <div className="absolute bottom-12 left-0 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden w-40 z-50">
                  {(['available', 'en-route', 'on-scene', 'complete'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`w-full px-4 py-2 text-left text-sm font-semibold transition flex items-center gap-2 ${
                        responderStatus === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                      }`}
                    >
                      {status === 'available' && '🟢'}
                      {status === 'en-route' && '🔵'}
                      {status === 'on-scene' && '🟢'}
                      {status === 'complete' && '✅'}
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Right: Action Controls */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            {/* Phone button */}
            <button
              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition shadow-lg"
              aria-label="Call victim"
              title="Call victim"
            >
              <Phone className="w-5 h-5" />
            </button>

            {/* Mute button */}
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !videoRef.current.muted;
                  setIsMuted(videoRef.current.muted);
                }
              }}
              className="p-2 bg-black/50 hover:bg-black text-white rounded-full transition shadow-lg"
              aria-label="Toggle mute"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Fullscreen button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-black/50 hover:bg-black text-white rounded-full transition shadow-lg"
              aria-label="Toggle fullscreen"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>

          {/* Accept/Reject Buttons (if responder hasn't accepted yet) */}
          {responderStatus === 'available' && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-4 backdrop-blur-sm">
              <button
                onClick={() => {
                  onReject?.();
                  setShowStatusMenu(false);
                }}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg shadow-lg transition"
              >
                ❌ Reject
              </button>
              <button
                onClick={() => {
                  onAccept?.();
                  handleStatusChange('en-route');
                }}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg shadow-lg transition"
              >
                ✅ Accept
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
