'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface StoryContextValue {
  mediaLength: number;
  currentIndex: number;
  progress: number;
  isPaused: boolean;
  isEnded: boolean;
  next: () => void;
  prev: () => void;
  pause: () => void;
  play: () => void;
  setIndex: (index: number) => void;
}

const StoryContext = React.createContext<StoryContextValue | null>(null);

export function useStory() {
  const ctx = React.useContext(StoryContext);
  if (!ctx) throw new Error('useStory must be used inside <Story />');
  return ctx;
}

interface StoryProps {
  mediaLength: number;
  duration?: number;
  className?: string;
  children: React.ReactNode;
}

export function Story({
  mediaLength,
  duration = 4000,
  className,
  children,
}: StoryProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isEnded, setIsEnded] = React.useState(false);

  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (isPaused || isEnded || mediaLength === 0) return;

    const tick = 50;
    const totalTicks = duration / tick;

    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + 100 / totalTicks;
        if (next >= 100) {
          clearInterval(intervalRef.current!);
          if (currentIndex < mediaLength - 1) {
            setCurrentIndex((i) => i + 1);
            return 0;
          } else {
            setIsEnded(true);
            setIsPaused(true);
            return 100;
          }
        }
        return next;
      });
    }, tick);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentIndex, isPaused, isEnded, mediaLength, duration]);

  const value: StoryContextValue = {
    mediaLength,
    currentIndex,
    progress,
    isPaused,
    isEnded,
    next: () => {
      if (currentIndex < mediaLength - 1) {
        setCurrentIndex((i) => i + 1);
        setProgress(0);
      }
    },
    prev: () => {
      if (currentIndex > 0) {
        setCurrentIndex((i) => i - 1);
        setProgress(0);
      }
    },
    pause: () => setIsPaused(true),
    play: () => {
      setIsPaused(false);
      setIsEnded(false);
    },
    setIndex: (i) => {
      setCurrentIndex(i);
      setProgress(0);
      setIsPaused(false);
      setIsEnded(false);
    },
  };

  return (
    <StoryContext.Provider value={value}>
      <div className={cn('relative w-full h-full', className)}>
        {children}
      </div>
    </StoryContext.Provider>
  );
}
