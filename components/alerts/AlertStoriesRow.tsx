'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Alert } from './types';

/* ---------------- TYPES ---------------- */
export interface AlertWithLocation extends Alert {
  lat: number;
  lng: number;
}

interface Props {
  alerts: AlertWithLocation[];
  onSelect: (alert: AlertWithLocation) => void;
}

/* ---------------- COMPONENT ---------------- */
export default function AlertStoriesRow({ alerts, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3 overflow-y-auto">
      {alerts.map((alert) => (
        <button
          key={alert.id}
          onClick={() => onSelect(alert)}
          className={cn(
            'flex items-center gap-4 w-full rounded-lg p-3',
            'bg-white/5 hover:bg-white/10 transition',
            'border border-white/10'
          )}
        >
          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-500 to-orange-500 p-[2px] shrink-0">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {alert.type.slice(0, 6)}
              </span>
            </div>
          </div>

          {/* Text */}
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">
              {alert.type.replace('_', ' ')}
            </p>
            <p className="text-xs opacity-70">
              {Math.floor(
                (Date.now() - new Date(alert.created_at).getTime()) / 60000
              ) + 'm ago'}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
