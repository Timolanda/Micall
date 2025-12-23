'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { formatTimeRemaining, getElapsedTime } from '@/utils/navigationUtils';

interface ResponseTimerProps {
  alertCreatedAt: string | Date;
  estimatedArrivalMinutes?: number;
  responderStatus?: 'available' | 'en-route' | 'on-scene' | 'complete';
  onTimeExpire?: () => void;
  maxWaitMinutes?: number;
}

export default function ResponseTimer({
  alertCreatedAt,
  estimatedArrivalMinutes = 0,
  responderStatus = 'available',
  onTimeExpire,
  maxWaitMinutes = 30,
}: ResponseTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = getElapsedTime(alertCreatedAt);
      const maxWaitSeconds = maxWaitMinutes * 60;
      const remaining = Math.max(0, maxWaitSeconds - elapsed);

      setElapsedTime(elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0 && !isExpired) {
        setIsExpired(true);
        onTimeExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [alertCreatedAt, maxWaitMinutes, isExpired, onTimeExpire]);

  // Calculate progress percentage
  const totalSeconds = maxWaitMinutes * 60;
  const progressPercent = ((totalSeconds - timeRemaining) / totalSeconds) * 100;

  // Color based on remaining time
  const getProgressColor = () => {
    const percentRemaining = (timeRemaining / totalSeconds) * 100;
    if (percentRemaining > 50) return 'from-green-500 to-blue-500';
    if (percentRemaining > 25) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-orange-500';
  };

  const getStatusColor = () => {
    switch (responderStatus) {
      case 'en-route':
        return 'bg-blue-100 border-blue-300';
      case 'on-scene':
        return 'bg-amber-100 border-amber-300';
      case 'complete':
        return 'bg-green-100 border-green-300';
      default:
        return 'bg-gray-100 border-gray-300';
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
        return 'Awaiting Response';
    }
  };

  return (
    <div className="space-y-3">
      {/* Timer Card */}
      <div className={`rounded-lg border-2 p-4 ${getStatusColor()}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-700" />
            <span className="font-semibold text-gray-900">Response Timer</span>
          </div>
          <span className="text-xs font-bold bg-white px-2 py-1 rounded-full text-gray-700">
            {getStatusLabel()}
          </span>
        </div>

        {/* Time displays */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Elapsed Time */}
          <div className="bg-white/60 rounded-lg p-2">
            <p className="text-xs text-gray-600 font-semibold">Elapsed</p>
            <p className="text-lg font-bold text-gray-900">
              {formatTimeRemaining(elapsedTime)}
            </p>
          </div>

          {/* Time Remaining */}
          <div className="bg-white/60 rounded-lg p-2">
            <p className="text-xs text-gray-600 font-semibold">Remaining</p>
            <p className={`text-lg font-bold ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
              {isExpired ? 'Expired' : formatTimeRemaining(timeRemaining)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-300`}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>

        {/* Status Info */}
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600 font-semibold">Alert Created</p>
              <p className="text-gray-900">{new Date(alertCreatedAt).toLocaleTimeString()}</p>
            </div>
            <div>
              <p className="text-gray-600 font-semibold">Estimated ETA</p>
              <p className="text-gray-900">
                {estimatedArrivalMinutes > 0 ? `~${estimatedArrivalMinutes}m` : 'Calculating...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning if expired */}
      {isExpired && (
        <div className="bg-red-100 border-2 border-red-400 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-900">Response Time Exceeded</p>
            <p className="text-sm text-red-800 mt-1">
              No responder has arrived within {maxWaitMinutes} minutes. Consider calling emergency services.
            </p>
          </div>
        </div>
      )}

      {/* Warning if running out of time */}
      {!isExpired && timeRemaining < 300 && timeRemaining > 0 && (
        <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-orange-900">Running Out of Time</p>
            <p className="text-sm text-orange-800 mt-1">
              Less than 5 minutes remaining. Ensure responders are on the way.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
