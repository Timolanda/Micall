'use client';
import { useEffect } from 'react';

interface ModalProps {
  children: React.ReactNode;
  onClose?: () => void;
  overlayClosable?: boolean; // default: true
}

export default function Modal({ children, onClose, overlayClosable = true }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={() => overlayClosable && onClose?.()}
    >
      <div
        className="bg-zinc-900 text-white rounded-xl p-6 shadow-2xl w-full max-w-md mx-4 relative animate-fade-in"
        onClick={(e) => e.stopPropagation()} // Prevent overlay click from closing
      >
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white text-xl bg-zinc-800 hover:bg-zinc-700 p-1 rounded-full"
            aria-label="Close modal"
          >
            ×
          </button>
          )}
        {children}
      </div>
    </div>
  );
} 