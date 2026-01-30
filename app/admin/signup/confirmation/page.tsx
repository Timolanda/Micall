'use client';

export const dynamic = 'force-dynamic';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CheckCircle, Home, Mail, Clock } from 'lucide-react';

export default function SignupConfirmationPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/landing');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
              <CheckCircle size={64} className="text-green-400" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-primary mb-2">Application Submitted!</h1>
        <p className="text-accent text-lg mb-6">
          Your admin registration request has been received.
        </p>

        {/* Details */}
        <div className="bg-surface-secondary rounded-lg p-6 border border-surface-secondary/50 mb-6 space-y-4">
          {/* Verification in Progress */}
          <div className="flex items-start gap-3">
            <Clock size={20} className="text-blue-400 mt-1 flex-shrink-0" />
            <div className="text-left">
              <h3 className="font-semibold text-primary mb-1">Verification in Progress</h3>
              <p className="text-accent text-sm">
                Our team will review your documents and verify your institution.
              </p>
            </div>
          </div>

          {/* Email Notification */}
          <div className="flex items-start gap-3">
            <Mail size={20} className="text-purple-400 mt-1 flex-shrink-0" />
            <div className="text-left">
              <h3 className="font-semibold text-primary mb-1">Email Notification</h3>
              <p className="text-accent text-sm">
                We'll send you an email at <span className="font-medium">{user?.email}</span> once your
                application is reviewed.
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-blue-400 mb-3">📋 What Happens Next:</h3>
          <ol className="space-y-2 text-sm text-accent">
            <li className="flex gap-2">
              <span className="text-blue-400 font-bold">1.</span>
              <span>Documents are verified by our admin team</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400 font-bold">2.</span>
              <span>Your institution details are confirmed</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400 font-bold">3.</span>
              <span>You receive approval notification (typically 24-48 hours)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400 font-bold">4.</span>
              <span>Access to admin dashboard becomes available</span>
            </li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-background hover:bg-primary/90 transition font-medium"
          >
            <Home size={18} />
            Return to Home
          </button>

          <button
            onClick={() => router.push('/profile')}
            className="w-full px-6 py-3 rounded-lg border border-surface-secondary text-primary hover:bg-surface-secondary transition font-medium"
          >
            View Profile
          </button>
        </div>

        {/* Help Text */}
        <p className="text-accent text-sm mt-6">
          Have questions? Contact support at{' '}
          <a href="mailto:support@micall.com" className="text-primary hover:underline">
            support@micall.com
          </a>
        </p>
      </div>
    </div>
  );
}
