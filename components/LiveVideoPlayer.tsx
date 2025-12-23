'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Maximize2, AlertTriangle } from 'lucide-react';

interface LiveVideoPlayerProps {
  alertId: number;
  videoUrl?: string;
  isLive?: boolean;
  userLocation?: { latitude: number; longitude: number };
}

export default function LiveVideoPlayer({
  alertId,
  videoUrl,
  isLive = false,
  userLocation,
}: LiveVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
          {/* Live Badge */}
          <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </div>

          {/* Location Badge */}
          {userLocation && (
            <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
              📍 {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !videoRef.current.muted;
                  setIsMuted(videoRef.current.muted);
                }
              }}
              className="p-2 bg-black/50 hover:bg-black text-white rounded-full transition"
              aria-label="Toggle mute"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-black/50 hover:bg-black text-white rounded-full transition"
              aria-label="Toggle fullscreen"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
