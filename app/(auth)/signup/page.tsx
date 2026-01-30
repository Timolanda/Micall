'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle, Upload, User } from 'lucide-react';
import { validatePhoneNumber } from '@/utils/phoneValidator';

export default function SignUpPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Handle Google sign up
  const handleGoogleSignUp = async () => {
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
        setError(googleError.message || 'Google sign up failed');
        setLoading(false);
      }
    } catch (err) {
      console.error('Google sign up error:', err);
      setError(err instanceof Error ? err.message : 'Google sign up failed');
      setLoading(false);
    }
  };

  // Handle profile image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile picture must be smaller than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    setProfileImage(file);
    const preview = URL.createObjectURL(file);
    setProfileImagePreview(preview);
  };

  // Validate phone number
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhone(value);

    if (value) {
      const result = validatePhoneNumber(value);
      setPhoneError(result.isValid ? null : result.error || 'Invalid phone number');
    } else {
      setPhoneError(null);
    }
  };

  // Handle form submission
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!email || !password || !confirmPassword || !fullName || !phone) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      setError(phoneValidation.error || 'Invalid phone number');
      return;
    }

    if (!agreeToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user?.id) {
        setError('Failed to create user account');
        setLoading(false);
        return;
      }

      const userId = authData.user.id;

      // 2️⃣ Upload profile picture if provided
      let profilePictureUrl: string | null = null;
      if (profileImage) {
        const fileExt = profileImage.name.split('.').pop();
        const fileName = `${userId}-profile-${Date.now()}.${fileExt}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from('profiles')
            .upload(`avatars/${userId}/${fileName}`, profileImage);

          if (uploadError) {
            console.warn('Profile picture upload failed:', uploadError);
            // Don't fail the signup if profile picture fails
          } else {
            // Get public URL
            const { data } = supabase.storage
              .from('profiles')
              .getPublicUrl(`avatars/${userId}/${fileName}`);
            profilePictureUrl = data.publicUrl;
          }
        } catch (uploadErr) {
          console.warn('Profile picture upload error:', uploadErr);
          // Continue with signup even if picture upload fails
        }
      }

      // 3️⃣ Create profile with name, phone, and profile picture
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: fullName.trim(),
          phone: phoneValidation.formatted,
          profile_picture_url: profilePictureUrl,
          role: 'victim',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('Profile creation failed:', profileError);
        setError('Account created but profile setup failed. Please contact support.');
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      console.error('SignUp error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
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

        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Profile Picture */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div
                className="w-24 h-24 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center cursor-pointer hover:border-red-500 transition"
                onClick={() => fileInputRef.current?.click()}
              >
                {profileImagePreview ? (
                  <img
                    src={profileImagePreview}
                    alt="Profile preview"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 bg-red-500 rounded-full p-2 text-white">
                <Upload size={14} />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={loading}
              />
            </div>
            <p className="text-xs text-slate-500 text-center mt-2 w-full">
              Click to upload profile picture (optional, max 5MB)
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              placeholder="John Doe"
              autoComplete="name"
              className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-slate-500 transition"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading || success}
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="+1 (555) 123-4567"
              autoComplete="tel"
              className={`w-full px-4 py-2.5 bg-slate-700 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-white placeholder-slate-500 transition ${
                phoneError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-600 focus:ring-red-500'
              }`}
              value={phone}
              onChange={handlePhoneChange}
              disabled={loading || success}
            />
            {phoneError && (
              <p className="text-xs text-red-400 mt-1">{phoneError}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
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
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-slate-500 transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || success}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm your password"
              autoComplete="new-password"
              className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-slate-500 transition"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading || success}
            />
          </div>

          {/* Terms & Conditions */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="terms"
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              disabled={loading || success}
              className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-red-500 focus:ring-red-500 cursor-pointer"
            />
            <label htmlFor="terms" className="text-sm text-slate-400 cursor-pointer">
              I agree to the{' '}
              <a href="/privacy" className="text-red-500 hover:text-red-400 underline">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="/help" className="text-red-500 hover:text-red-400 underline">
                Terms of Service
              </a>
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
                Account created successfully! Redirecting to dashboard...
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 rounded-lg font-semibold text-white shadow-lg transition transform hover:scale-105 disabled:hover:scale-100"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-slate-700"></div>
            <span className="text-sm text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-700"></div>
          </div>

          {/* Google Sign Up Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading || success}
            className="w-full py-2.5 bg-white hover:bg-slate-100 disabled:bg-slate-300 rounded-lg font-semibold text-slate-900 shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 c0-3.331,2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.461,2.268,15.365,1,12.545,1 C6.438,1,1.514,5.921,1.514,12c0,6.079,4.924,11,11.031,11c5.495,0,10.212-4.007,11.227-9.425"
              />
            </svg>
            Sign up with Google
          </button>

          {/* Sign In Link */}
          <p className="text-center text-sm text-slate-400 mt-6">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/signin')}
              className="text-red-500 hover:text-red-400 underline font-medium"
            >
              Sign In
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
