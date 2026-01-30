'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      // Google OAuth with Supabase (configured in Supabase dashboard)
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (googleError) {
        console.error('Google OAuth error:', googleError);
        setError(googleError.message || 'Google sign in failed');
        setLoading(false);
      }
    } catch (err) {
      console.error('Google sign in error:', err);
      setError(err instanceof Error ? err.message : 'Google sign in failed');
      setLoading(false);
    }
  };

  // Handle sign in
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || 'Failed to sign in');
        setLoading(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem('micall_remember_email', email);
      } else {
        localStorage.removeItem('micall_remember_email');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (err) {
      console.error('SignIn error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('micall_remember_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
    }
  }, []);

  // Handle keyboard enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSignIn(e as any);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-red-500/20 rounded-full mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">MiCall</h1>
          <p className="text-slate-400">Emergency Response in Your Hands</p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              autoComplete="email"
              className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-slate-500 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || success}
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="text-xs text-red-500 hover:text-red-400 underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-slate-500 transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading || success}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || success}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading || success}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-red-500 focus:ring-red-500 cursor-pointer"
            />
            <label htmlFor="remember" className="text-sm text-slate-400 cursor-pointer">
              Remember my email
            </label>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="flex items-start gap-3 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
              <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
              <span className="text-green-300 text-sm">
                Sign in successful! Redirecting...
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 rounded-lg font-semibold text-white shadow-lg transition transform hover:scale-105 disabled:hover:scale-100 mt-6"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-slate-700"></div>
            <span className="text-sm text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-700"></div>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || success}
            className="w-full py-2.5 bg-white hover:bg-slate-100 disabled:bg-slate-300 rounded-lg font-semibold text-slate-900 shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 c0-3.331,2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.461,2.268,15.365,1,12.545,1 C6.438,1,1.514,5.921,1.514,12c0,6.079,4.924,11,11.031,11c5.495,0,10.212-4.007,11.227-9.425"
              />
            </svg>
            Sign in with Google
          </button>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-slate-400 mt-6">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/signup')}
              className="text-red-500 hover:text-red-400 underline font-medium"
            >
              Create one
            </button>
          </p>

          {/* Emergency Note */}
          <div className="mt-8 p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
            <p className="text-xs text-slate-400 text-center">
              🚨 <span className="text-red-400 font-semibold">Emergency?</span> Call 911 directly
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
