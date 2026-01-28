'use client';

import React, { useState, useEffect } from 'react';
import { useInvite } from '@/hooks/useInvite';
import { X, Share2, Copy, CheckCircle, AlertCircle } from 'lucide-react';

interface InviteModalProps {
  sourceFlow?: 'profile' | 'contacts' | 'onboarding';
  onClose: () => void;
}

export default function InviteModal({ sourceFlow = 'profile', onClose }: InviteModalProps) {
  const { loading, error, generateInvite, shareInvite, copyInviteLink } = useInvite();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  // Generate invite on mount
  useEffect(() => {
    const generate = async () => {
      const link = await generateInvite();
      if (link) {
        setInviteLink(link);
      }
    };
    generate();
  }, [generateInvite]);

  const handleShare = async () => {
    if (!inviteLink) return;

    const result = await shareInvite(inviteLink);
    if (result) {
      setMessage({
        type: 'success',
        text: "✅ Invite sent. You've added someone to your safety circle.",
      });
      setTimeout(() => {
        setMessage(null);
        onClose();
      }, 2000);
    } else {
      setShareError('Share cancelled or not supported');
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;

    const result = await copyInviteLink(inviteLink);
    if (result) {
      setCopied(true);
      setMessage({
        type: 'success',
        text: '✅ Link copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } else {
      setMessage({
        type: 'error',
        text: '❌ Failed to copy link',
      });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md border border-gray-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/20 to-blue-900/20 border-b border-blue-500/30 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Invite Someone You Trust</h2>
            <p className="text-xs text-gray-400 mt-1">
              They'll be able to respond if you ever need help
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Error Messages */}
          {error && (
            <div className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {shareError && (
            <div className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{shareError}</p>
            </div>
          )}

          {/* Success Messages */}
          {message && (
            <div
              className={`flex items-start gap-3 p-3 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-900/20 border border-green-500/30'
                  : 'bg-red-900/20 border border-red-500/30'
              }`}
            >
              <CheckCircle
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  message.type === 'success' ? 'text-green-400' : 'text-red-400'
                }`}
              />
              <p
                className={`text-sm ${
                  message.type === 'success' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {message.text}
              </p>
            </div>
          )}

          {/* Invite Link Display */}
          {inviteLink && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-2">Your invite link:</p>
              <div className="flex items-center gap-2 bg-gray-900 rounded p-2">
                <code className="text-xs text-gray-300 flex-1 truncate font-mono">
                  {inviteLink.substring(0, 40)}...
                </code>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This link expires in 7 days. Share it with someone you trust.
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && !inviteLink && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Action Buttons */}
          {inviteLink && (
            <div className="space-y-3">
              {/* Share Button */}
              <button
                onClick={handleShare}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                <Share2 className="w-5 h-5" />
                Share Invite
              </button>

              {/* Copy Button */}
              <button
                onClick={handleCopy}
                disabled={loading || copied}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-lg transition-colors ${
                  copied
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-white'
                }`}
              >
                <Copy className="w-5 h-5" />
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
