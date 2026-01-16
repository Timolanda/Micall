'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white px-4">
      <form
        onSubmit={handleSignUp}
        className="w-full max-w-sm space-y-6"
      >
        <h2 className="text-2xl font-bold text-center">Create Your Account</h2>

        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          className="w-full p-3 bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading || success}
        />

        <input
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          className="w-full p-3 bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading || success}
        />

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
            <CheckCircle size={16} className="text-green-400" />
            <span className="text-green-400 text-sm">
              Check your email to verify your account
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || success}
          className="w-full py-3 bg-primary hover:bg-red-600 rounded-lg font-semibold text-lg shadow-md disabled:opacity-50"
        >
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>

        <p className="text-center text-sm text-zinc-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => router.push('/signin')}
            className="text-primary underline"
          >
            Sign In
          </button>
        </p>
      </form>
    </div>
  );
}
