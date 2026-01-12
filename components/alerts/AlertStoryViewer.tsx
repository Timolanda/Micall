'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Alert } from './types';

/* ---------------- TYPES ---------------- */
export interface AlertWithLocation extends Alert {
  lat: number;
  lng: number;
}

interface Props {
  alerts: AlertWithLocation[];
  initialAlertId: number;
  onClose: () => void;
  onRespond: (alert: AlertWithLocation) => void;
  onIgnore: (alertId: number) => void;
}

/* ---------------- COMPONENT ---------------- */
export default function AlertStoryViewer({
  alerts,
  initialAlertId,
  onClose,
  onRespond,
  onIgnore,
}: Props) {
  const startIndex = Math.max(
    0,
    alerts.findIndex((a) => a.id === initialAlertId)
  );

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentAlert = alerts[currentIndex];

  const advanceStory = useCallback(() => {
    if (currentIndex < alerts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  }, [currentIndex, alerts.length, onClose]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    timerRef.current && clearTimeout(timerRef.current);
    timerRef.current = setTimeout(advanceStory, 5000);
    return () => {
      timerRef.current && clearTimeout(timerRef.current);
    };
  }, [currentIndex, advanceStory]);

  const handleNext = () => {
    timerRef.current && clearTimeout(timerRef.current);
    advanceStory();
  };

  const handlePrev = () => {
    timerRef.current && clearTimeout(timerRef.current);
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Progress Bars */}
      <div className="flex space-x-1 p-3">
        {alerts.map((alert, index) => (
          <motion.div
            key={alert.id}
            className="flex-1 h-1 rounded bg-white/30"
            animate={{
              width:
                index < currentIndex
                  ? '100%'
                  : index === currentIndex
                  ? '100%'
                  : '0%',
            }}
            transition={{
              duration: index === currentIndex ? 5 : 0,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentAlert.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="relative w-full h-full flex flex-col justify-end"
        >
          {/* Close Button */}
          <button onClick={onClose} className="absolute top-4 right-4 z-20">
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Alert Content */}
          <div className="absolute bottom-0 w-full p-6 space-y-4 z-20">
            <span className="bg-red-600 text-xs px-2 py-1 rounded">LIVE</span>

            <h2 className="text-xl font-bold">{currentAlert.type}</h2>

            <p className="text-sm opacity-90">{currentAlert.message}</p>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <Button
                variant="outline"
                className="py-3 rounded-lg"
                onClick={() => {
                  onIgnore(currentAlert.id);
                  handleNext();
                }}
              >
                Ignore
              </Button>

              <Button
                className="py-3 rounded-lg bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2 font-semibold"
                onClick={() => onRespond(currentAlert)}
              >
                <Navigation className="w-4 h-4" />
                Respond
              </Button>
            </div>
          </div>

          {/* Swipe Areas */}
          <div className="absolute inset-0 flex">
            <div className="flex-1 h-full" onClick={handlePrev} />
            <div className="flex-1 h-full" onClick={handleNext} />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
