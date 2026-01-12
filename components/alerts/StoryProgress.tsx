'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useStory } from './Story';

interface StoryProgressProps {
  className?: string;
}

export function StoryProgress({ className }: StoryProgressProps) {
  const { mediaLength, currentIndex, progress, setIndex } = useStory();

  return (
    <div className={cn('flex gap-1 px-2 pt-2', className)}>
      {Array.from({ length: mediaLength }).map((_, i) => {
        const isActive = i === currentIndex;
        const isPast = i < currentIndex;

        return (
          <div
            key={i}
            className="flex-1 h-1 rounded bg-white/30 overflow-hidden cursor-pointer"
            onClick={() => setIndex(i)}
          >
            <div
              className="h-full bg-white transition-all"
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
