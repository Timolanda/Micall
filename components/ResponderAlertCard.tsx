'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Phone, Video, X, Clock, Users, Navigation, CheckCircle, ArrowRight } from 'lucide-react';

interface ResponderAlertCardProps {
  alertId: number;
  type: string;
  message: string;
  lat: number;
  lng: number;
  distance: number;
  userLocation: [number, number];
  createdAt: string;
  responderCount: number;
  videoUrl?: string;
  onRespond: (alertId: number) => void;
  onDismiss: (alertId: number) => void;
  onCall?: (alertId: number) => void;
  onViewVideo?: (alertId: number) => void;
}

export default function ResponderAlertCard({
  alertId,
  type,
  message,
  lat,
  lng,
  distance,
  userLocation,
  createdAt,
  responderCount,
  videoUrl,
  onRespond,
  onDismiss,
  onCall,
  onViewVideo,
}: ResponderAlertCardProps) {
  const [timeElapsed, setTimeElapsed] = useState('0s');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium'>('high');

  // Calculate time elapsed
  useEffect(() => {
    const updateTime = () => {
      const now = new Date().getTime();
      const created = new Date(createdAt).getTime();
      const elapsed = Math.floor((now - created) / 1000);

      if (elapsed < 60) {
        setTimeElapsed(`${elapsed}s`);
      } else if (elapsed < 3600) {
        setTimeElapsed(`${Math.floor(elapsed / 60)}m`);
      } else {
        setTimeElapsed(`${Math.floor(elapsed / 3600)}h`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  // Calculate ETA (rough estimate: 5km/h average speed = 12 min/km)
  const etaMinutes = Math.ceil((distance / 5) * 60);

  // Determine severity based on type and distance
  useEffect(() => {
    if (distance < 0.5 && (type === 'SOS' || type === 'Go Live')) {
      setSeverity('critical');
    } else if (distance < 1 || type === 'SOS') {
      setSeverity('high');
    } else {
      setSeverity('medium');
    }
  }, [distance, type]);

  const getSeverityColor = () => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-gradient-to-br from-red-50 to-red-50/50';
      case 'high':
        return 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-50/50';
      default:
        return 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-yellow-50/50';
    }
  };

  const getSeverityBadgeColor = () => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-600 text-white';
      default:
        return 'bg-yellow-600 text-white';
    }
  };

  const getAlertIcon = () => {
    switch (type) {
      case 'SOS':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'Go Live':
      case 'video':
        return <Video className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getAlertTitle = () => {
    if (type === 'SOS') return '🚨 SOS Emergency';
    if (type === 'Go Live' || type === 'video') return '📹 Emergency Video';
    return '⚠️ Emergency Alert';
  };

  return (
    <div className={`rounded-2xl border-2 p-5 shadow-md hover:shadow-lg transition-all ${getSeverityColor()}`}>
      {/* Header with severity badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {getAlertIcon()}
          <div>
            <h3 className="font-bold text-lg text-gray-900">{getAlertTitle()}</h3>
            <p className="text-xs text-gray-600 mt-0.5">{message}</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityBadgeColor()}`}>
          {severity.toUpperCase()}
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4 bg-white/60 rounded-lg p-3 backdrop-blur-sm">
        {/* Distance */}
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-blue-600" />
          <div>
            <p className="text-xs text-gray-500">Distance</p>
            <p className="text-sm font-bold text-gray-900">{distance.toFixed(2)} km</p>
          </div>
        </div>

        {/* Time elapsed */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-600" />
          <div>
            <p className="text-xs text-gray-500">Elapsed</p>
            <p className="text-sm font-bold text-gray-900">{timeElapsed}</p>
          </div>
        </div>

        {/* Responders */}
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-600" />
          <div>
            <p className="text-xs text-gray-500">Responding</p>
            <p className="text-sm font-bold text-gray-900">{responderCount}</p>
          </div>
        </div>
      </div>

      {/* Location info */}
      <div className="bg-white/60 rounded-lg p-3 mb-4 backdrop-blur-sm">
        <div className="flex items-start gap-2 mb-2">
          <MapPin className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-gray-700">Location</p>
            <p className="text-sm text-gray-600">{lat.toFixed(4)}, {lng.toFixed(4)}</p>
          </div>
        </div>
        <div className="text-xs text-gray-500 ml-6">
          <p>📍 ETA: ~{etaMinutes} minutes away</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        {/* Call button */}
        {onCall && (
          <button
            onClick={() => onCall(alertId)}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition flex items-center justify-center gap-1"
            title="Call victim"
          >
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">Call</span>
          </button>
        )}

        {/* View video button */}
        {videoUrl && onViewVideo && (
          <button
            onClick={() => onViewVideo(alertId)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition flex items-center justify-center gap-1"
            title="View live video"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">Video</span>
          </button>
        )}

        {/* Respond button */}
        <button
          onClick={() => onRespond(alertId)}
          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition flex items-center justify-center gap-1 col-span-1"
          title="Respond to this emergency"
        >
          <ArrowRight className="w-4 h-4" />
          <span className="hidden sm:inline">Respond</span>
        </button>
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(alertId)}
        className="w-full mt-2 px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-1"
      >
        <X className="w-4 h-4" />
        Dismiss
      </button>
    </div>
  );
}
