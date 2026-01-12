'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/* =====================================================
   CONTEXT TYPES
===================================================== */

interface StoryContextValue {
  mediaLength: number;
  currentIndex: number;
  progress: number;
  isPaused: boolean;
  isEnded: boolean;
  setCurrentIndex: (index: number) => void;
  pause: () => void;
  resume: () => void;
}

const StoryContext = React.createContext<StoryContextValue | null>(null);

function useStoryContext() {
  const ctx = React.useContext(StoryContext);
  if (!ctx) {
    throw new Error('Story components must be used inside <Story />');
  }
  return ctx;
}

/* =====================================================
   STORY ROOT
===================================================== */

interface StoryProps extends React.HTMLAttributes<HTMLDivElement> {
  mediaLength: number;
  duration?: number; // per slide (ms)
}

export function Story({
  mediaLength,
  duration = 5000,
  className,
  children,
  ...props
}: StoryProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isEnded, setIsEnded] = React.useState(false);

  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const tickRef = React.useRef(0);

  React.useEffect(() => {
    if (mediaLength === 0 || isPaused || isEnded) return;

    tickRef.current = 0;
    setProgress(0);

    const tickMs = 50;
    const totalTicks = duration / tickMs;

    intervalRef.current = setInterval(() => {
      tickRef.current += 1;
      const pct = (tickRef.current / totalTicks) * 100;
      setProgress(pct);

      if (tickRef.current >= totalTicks) {
        if (currentIndex < mediaLength - 1) {
          setCurrentIndex((i) => i + 1);
        } else {
          setIsEnded(true);
          setIsPaused(true);
        }
      }
    }, tickMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentIndex, isPaused, isEnded, mediaLength, duration]);

  const pause = () => setIsPaused(true);

  const resume = () => {
    if (isEnded) {
      setIsEnded(false);
      setCurrentIndex(0);
    }
    setIsPaused(false);
  };

  return (
    <StoryContext.Provider
      value={{
        mediaLength,
        currentIndex,
        progress,
        isPaused,
        isEnded,
        setCurrentIndex,
        pause,
        resume,
      }}
    >
      <div
        className={cn(
          'relative w-full h-full overflow-hidden select-none',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </StoryContext.Provider>
  );
}

/* =====================================================
   STORY SLIDE
===================================================== */

interface StorySlideProps extends React.HTMLAttributes<HTMLDivElement> {
  index: number;
}

export function StorySlide({
  index,
  className,
  ...props
}: StorySlideProps) {
  const { currentIndex } = useStoryContext();

  if (index !== currentIndex) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 animate-in fade-in duration-300',
        className
      )}
      {...props}
    />
  );
}

/* =====================================================
   STORY PROGRESS BAR
===================================================== */

interface StoryProgressProps extends React.HTMLAttributes<HTMLDivElement> {}

export function StoryProgress({
  className,
  ...props
}: StoryProgressProps) {
  const {
    mediaLength,
    currentIndex,
    progress,
    setCurrentIndex,
  } = useStoryContext();

  return (
    <div
      className={cn('flex gap-1 px-2', className)}
      {...props}
    >
      {Array.from({ length: mediaLength }).map((_, i) => {
        const isActive = i === currentIndex;
        const isPast = i < currentIndex;

        return (
          <div
            key={i}
            onClick={() => setCurrentIndex(i)}
            className="flex-1 h-1 bg-white/30 rounded cursor-pointer overflow-hidden"
          >
            <div
              className={cn(
                'h-full bg-white transition-all',
                isActive && 'duration-75'
              )}
              style={{
                width: isActive ? `${progress}%` : isPast ? '100%' : '0%',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
