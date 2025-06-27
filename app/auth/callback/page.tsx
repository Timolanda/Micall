'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../utils/supabaseClient';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for error parameters
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          setStatus('error');
          setMessage(errorDescription || 'Authentication failed');
          setTimeout(() => router.push('/landing'), 3000);
          return;
        }

        // Handle the auth callback
        const { data, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          setStatus('error');
          setMessage('Authentication failed. Please try again.');
          setTimeout(() => router.push('/landing'), 3000);
          return;
        }

        if (data.session) {
          setStatus('success');
          setMessage('Authentication successful! Redirecting...');
          setTimeout(() => router.push('/'), 1500);
        } else {
          setStatus('error');
          setMessage('No session found. Please sign in again.');
          setTimeout(() => router.push('/landing'), 3000);
        }
      } catch (err) {
        setStatus('error');
        setMessage('An unexpected error occurred.');
        setTimeout(() => router.push('/landing'), 3000);
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-700/50 shadow-xl">
          {status === 'loading' && (
            <>
              <Loader2 size={48} className="mx-auto mb-4 animate-spin text-blue-400" />
              <h1 className="text-2xl font-bold mb-2">Processing Authentication</h1>
              <p className="text-gray-400">Please wait while we verify your credentials...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
              <h1 className="text-2xl font-bold mb-2 text-green-400">Success!</h1>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
              <h1 className="text-2xl font-bold mb-2 text-red-400">Authentication Error</h1>
              <p className="text-gray-400 mb-4">{message}</p>
              <button
                onClick={() => router.push('/landing')}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Go to Landing Page
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 