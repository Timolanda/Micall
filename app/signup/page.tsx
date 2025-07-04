'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async () => {
    setError(null);
    setSuccess(false);
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) {
        setError(error.message);
      } else {
        // Create profile row if user is returned (immediate sign up)
        const user = data?.user;
        if (user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: user.id,
            full_name: user.email, // or use user.user_metadata.full_name if available
            // add other fields as needed
          });
          if (profileError) {
            setError('Profile creation failed: ' + profileError.message);
            setLoading(false);
            return;
          }
        }
        setSuccess(true);
        setTimeout(() => router.push('/signin'), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white px-4">
      <div className="w-full max-w-sm space-y-6">
        <h2 className="text-2xl font-bold text-center">Create Your Account</h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 bg-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading || success}
        />

        <input
          type="password"
          placeholder="Password"
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
            <span className="text-green-400 text-sm">Check your email to verify your account!</span>
          </div>
        )}

        <button
          onClick={handleSignUp}
          disabled={loading || success}
          className="w-full py-3 bg-primary hover:bg-red-600 rounded-lg font-semibold text-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>

        <p className="text-center text-sm text-zinc-400">
          Already have an account?{' '}
          <button
            onClick={() => router.push('/signin')}
            className="text-primary underline"
            disabled={loading}
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
} 