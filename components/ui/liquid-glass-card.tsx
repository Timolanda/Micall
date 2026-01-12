'use client';
import React from 'react';
import { cn } from '@/lib/utils';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const LiquidGlassCard: React.FC<Props> = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        'relative bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
