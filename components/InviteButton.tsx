/**
 * InviteButton Component
 * Safety-first invite button with protective messaging
 * Used in Profile page (top-right) and Contacts empty state
 */

'use client';

import React, { useState } from 'react';
import { useInvite } from '@/hooks/useInvite';
import InviteModal from './InviteModal';
import { Share2 } from 'lucide-react';

interface InviteButtonProps {
  variant?: 'primary' | 'secondary' | 'compact';
  sourceFlow?: 'profile' | 'contacts' | 'onboarding';
  className?: string;
}

export default function InviteButton({
  variant = 'primary',
  sourceFlow = 'profile',
  className = '',
}: InviteButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const { loading } = useInvite();

  // Primary button: For Profile page header
  if (variant === 'primary') {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          disabled={loading}
          className={`
            inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg
            bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600
            text-white font-medium text-sm transition-all
            shadow-md hover:shadow-lg disabled:shadow-none
            ${className}
          `}
          aria-label="Invite someone you trust to your safety circle"
          title="Invite Someone You Trust"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Invite</span>
        </button>

        {showModal && (
          <InviteModal
            sourceFlow={sourceFlow}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  // Secondary button: Full width for empty states
  if (variant === 'secondary') {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          disabled={loading}
          className={`
            w-full px-4 py-3 rounded-lg
            bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600
            text-white font-medium transition-colors
            flex items-center justify-center gap-2
            ${className}
          `}
          aria-label="Invite someone you trust"
        >
          <Share2 className="w-5 h-5" />
          {loading ? 'Generating...' : 'Invite Someone You Trust'}
        </button>

        {showModal && (
          <InviteModal
            sourceFlow={sourceFlow}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  // Compact button: Icon only
  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          disabled={loading}
          className={`
            p-2 rounded-full
            bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600
            text-white transition-all
            shadow-md hover:shadow-lg
            ${className}
          `}
          aria-label="Invite someone you trust to your safety circle"
          title="Invite Someone You Trust"
        >
          <Share2 className="w-5 h-5" />
        </button>

        {showModal && (
          <InviteModal
            sourceFlow={sourceFlow}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  return null;
}
