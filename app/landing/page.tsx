'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-zinc-950 flex flex-col items-center justify-between py-16 px-6 text-white">
      {/* Logo + Tagline */}
      <div className="flex flex-col items-center gap-4 mt-10 text-center">
        <Image
          src="/logo.png"
          alt="MiCall Logo"
          width={96}
          height={96}
          priority
          className="w-24 h-24"
        />
        <h1 className="text-3xl font-extrabold tracking-wide">MiCall</h1>
        <p className="text-zinc-400 max-w-md text-base leading-relaxed">
          Emergency assistance at your fingertips. Go Live. Get Help. Stay Safe.
        </p>
      </div>

      {/* Illustration */}
      <div className="my-8">
        <Image
          src="/illustration-emergency.svg"
          alt="Emergency Illustration"
          width={288}
          height={288}
          priority
          className="w-72 drop-shadow-lg"
        />
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => router.push('/signup')}
          className="bg-danger hover:bg-red-600 text-white py-3 rounded-xl text-lg font-semibold shadow-md transition"
        >
          Get Started
        </button>
        <button
          onClick={() => router.push('/signin')}
          className="border border-zinc-500 hover:border-zinc-300 text-white py-3 rounded-xl text-lg font-medium"
        >
          Sign In
        </button>
      </div>

      {/* Footer */}
      <p className="text-xs text-zinc-500 mt-10">&copy; 2025 MiCall. All rights reserved.</p>
    </div>
  );
} 