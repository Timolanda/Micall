'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useStory } from './Story';

interface StorySlideProps {
  index: number;
  className?: string;
  children: React.ReactNode;
}

export function StorySlide({
  index,
  className,
  children,
}: StorySlideProps) {
  const { currentIndex } = useStory();

  if (index !== currentIndex) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 animate-in fade-in duration-200',
        className,
      )}
    >
      {children}
    </div>
  );
}
