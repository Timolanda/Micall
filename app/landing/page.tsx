'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Zap, Users, Shield, Video, AlertCircle } from 'lucide-react';

export default function LandingPage() {
  const emergencyTypes = [
    { icon: '🩺', label: 'Health', description: 'Medical emergencies' },
    { icon: '🔥', label: 'Fire', description: 'Fire & smoke hazards' },
    { icon: '🚨', label: 'Assault', description: 'Personal safety threats' },
    { icon: '🚗', label: 'Accident', description: 'Traffic & collisions' },
  ];

  const steps = [
    {
      number: '1',
      title: 'Send an Alert',
      description: 'Choose the type of emergency and notify people nearby.',
      icon: AlertCircle,
    },
    {
      number: '2',
      title: 'Community Responds',
      description: 'Anyone close can respond, assist, or guide.',
      icon: Users,
    },
    {
      number: '3',
      title: 'Help Arrives Faster',
      description: 'Because help is already near you.',
      icon: Zap,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 via-white to-red-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-red-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-red-600">MiCall</div>
          <Link
            href="/signup"
            className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <Heart className="w-16 h-16 text-red-600 mx-auto mb-6 animate-pulse" />
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          When an emergency happens,{' '}
          <span className="text-red-600">help shouldn&apos;t be far.</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          MiCall connects you to people near you — in real time.
          Because sometimes help isn&apos;t about authority. It&apos;s about proximity.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-4 bg-red-600 text-white rounded-lg font-semibold text-lg hover:bg-red-700 transition transform hover:scale-105"
          >
            Join the Community
          </Link>
          <button
            onClick={() =>
              document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="px-8 py-4 border-2 border-red-600 text-red-600 rounded-lg font-semibold text-lg hover:bg-red-50 transition"
          >
            See How It Works
          </button>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-16">
          Three Simple Steps
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <Icon className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-center leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Emergency Coverage */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 bg-white rounded-3xl my-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-4">
          We Cover Real Emergencies
        </h2>
        <p className="text-center text-gray-600 mb-12 text-lg">
          Built for moments that matter most.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {emergencyTypes.map((type) => (
            <div
              key={type.label}
              className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 text-center hover:shadow-lg transition"
            >
              <div className="text-4xl mb-3">{type.icon}</div>
              <h3 className="font-bold text-gray-900 mb-1">{type.label}</h3>
              <p className="text-sm text-gray-600">{type.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live Video */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-3xl p-8 sm:p-12 text-white">
          <div className="flex gap-4">
            <Video className="w-8 h-8 mt-1" />
            <div>
              <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm font-semibold mb-3">
                Coming Soon
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">Live Video Alerts</h3>
              <p className="text-lg text-white/90">
                Share real-time video during emergencies so responders understand the situation faster.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
          Be There for Someone.<br />
          <span className="text-red-600">Know Someone Will Be There for You.</span>
        </h2>
        <Link
          href="/signup"
          className="inline-block px-10 py-4 bg-red-600 text-white rounded-lg font-bold text-lg hover:bg-red-700 transition transform hover:scale-105"
        >
          Sign Up & Join MiCall
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-center text-gray-600 text-sm">
          © 2025 MiCall. Community-powered emergency response.
        </div>
      </footer>
    </div>
  );
}
