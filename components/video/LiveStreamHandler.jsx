import React, { useState, useRef, useEffect } from 'react';
import { Video, Wifi, Eye, Radio, AlertCircle, Share2 } from 'lucide-react';

const LiveStreamHandler = ({ isEmergencyActive, onStreamStart }) => {
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamQuality, setStreamQuality] = useState('high'); // high, medium, low
  const [streamHealth, setStreamHealth] = useState('excellent'); // excellent, good, poor
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const wsRef = useRef(null); // WebSocket reference

  useEffect(() => {
    if (isEmergencyActive && !isLive) {
      startLiveStream();
    }
    return () => stopLiveStream();
  }, [isEmergencyActive]);

  const startLiveStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      // Initialize WebSocket connection for live streaming
      initializeWebSocket();

      // Start stream timer
      const startTime = Date.now();
      const timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Simulate viewer count updates
      simulateViewerUpdates();

      setIsLive(true);
      onStreamStart?.();

      return () => {
        clearInterval(timer);
      };
    } catch (error) {
      console.error('Error starting live stream:', error);
      setStreamHealth('poor');
    }
  };

  const stopLiveStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsLive(false);
    setViewerCount(0);
  };

  const initializeWebSocket = () => {
    // Replace with your actual WebSocket server URL
    wsRef.current = new WebSocket('wss://your-streaming-server.com');

    wsRef.current.onopen = () => {
      console.log('WebSocket Connected');
      setStreamHealth('excellent');
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setStreamHealth('poor');
    };

    wsRef.current.onclose = () => {
      setStreamHealth('poor');
    };
  };

  const simulateViewerUpdates = () => {
    // Simulate viewer count changes
    setInterval(() => {
      setViewerCount(prev => Math.min(prev + Math.floor(Math.random() * 3), 999));
    }, 5000);
  };

  const handleQualityChange = (quality) => {
    setStreamQuality(quality);
    // Implement quality adjustment logic here
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Video Preview */}
      <div className="rounded-lg overflow-hidden bg-black relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-64 object-cover"
        />
        
        {/* Live Indicator */}
        {isLive && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-sm font-medium">LIVE</span>
          </div>
        )}

        {/* Stream Stats */}
        {isLive && (
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-2">
              <Eye className="h-4 w-4 text-white" />
              <span className="text-white text-sm">{viewerCount}</span>
            </div>
            <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm">
              {formatTime(elapsedTime)}
            </div>
          </div>
        )}
      </div>

      {/* Stream Controls */}
      <div className="mt-4 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Radio className={`h-5 w-5 ${
              streamHealth === 'excellent' ? 'text-green-500' :
              streamHealth === 'good' ? 'text-yellow-500' : 'text-red-500'
            }`} />
            <span className="text-sm text-muted-foreground">
              Stream Health: {streamHealth}
            </span>
          </div>
          
          <button
            onClick={() => {
              const shareData = {
                title: 'Emergency Live Stream',
                text: 'Watch my emergency live stream',
                url: 'https://your-app.com/live/' // Replace with actual stream URL
              };
              if (navigator.share) {
                navigator.share(shareData);
              }
            }}
            className="p-2 hover:bg-muted rounded-full"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        {/* Quality Settings */}
        <div className="flex gap-2">
          {['high', 'medium', 'low'].map((quality) => (
            <button
              key={quality}
              onClick={() => handleQualityChange(quality)}
              className={`px-3 py-1 rounded-full text-sm ${
                streamQuality === quality
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {quality.charAt(0).toUpperCase() + quality.slice(1)}
            </button>
          ))}
        </div>

        {/* Main Stream Control */}
        <button
          onClick={isLive ? stopLiveStream : startLiveStream}
          className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 ${
            isLive
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-primary text-primary-foreground'
          }`}
        >
          {isLive ? (
            <>
              <AlertCircle className="h-5 w-5" />
              End Live Stream
            </>
          ) : (
            <>
              <Wifi className="h-5 w-5" />
              Start Live Stream
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default LiveStreamHandler; 