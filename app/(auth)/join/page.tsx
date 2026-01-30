'use client';

export const dynamic = 'force-dynamic';

/**
 * Join via Invite Page
 * Allows users to accept an invite code and join the safety circle
 * URL: /auth/join?invite_code=ABC123...
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const inviteCode = searchParams.get('invite_code');
  
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviterName, setInviterName] = useState<string | null>(null);

  // If user is not logged in, redirect to signin
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/signin?redirect=/auth/join?invite_code=${inviteCode}`);
    }
  }, [user, authLoading, router, inviteCode]);

  // Auto-accept invite if user is authenticated
  useEffect(() => {
    if (user && inviteCode && !accepted && !accepting) {
      acceptInvite();
    }
  }, [user, inviteCode, accepted, accepting]);

  const acceptInvite = async () => {
    if (!inviteCode || !user) return;

    setAccepting(true);
    setError(null);

    try {
      // Get auth session
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );

      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ inviteCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invite');
      }

      setAccepted(true);
      setInviterName(data.inviterName);

      // Redirect to contacts/profile after 3 seconds
      setTimeout(() => {
        router.push('/profile');
      }, 3000);
    } catch (err: unknown) {
      const error = err as any;
      setError(error.message || 'Failed to accept invite');
      setAccepting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <svg className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Join MiCall
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Please sign in to accept this invite and join the safety circle.
          </p>
          <Link
            href={`/auth/signin?redirect=/auth/join?invite_code=${inviteCode}`}
            className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Sign In
          </Link>
          <Link
            href={`/auth/signup?invite_code=${inviteCode}`}
            className="block w-full py-3 px-4 border-2 border-blue-600 text-blue-600 dark:text-blue-400 font-medium rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
        {/* Success State */}
        {accepted ? (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to Your Safety Circle!
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                You've joined {inviterName}'s safety circle. You'll both be notified of each other's emergencies.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Redirecting to your profile in a moment...
              </p>
            </div>
          </div>
        ) : (
          /* Loading/Processing State */
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <svg className="w-12 h-12 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Joining Safety Circle
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Processing your invite...
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200 text-sm mb-4">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setAccepting(false);
                    acceptInvite();
                  }}
                  className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>}>
      <JoinPageContent />
    </Suspense>
  );
}
