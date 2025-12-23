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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-600">MiCall</div>
          <Link
            href="/signup"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="mb-8">
          <Heart className="w-16 h-16 text-red-500 mx-auto mb-6 animate-pulse" />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            When an emergency happens,{' '}
            <span className="text-blue-600">help shouldn&apos;t be far.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            MiCall connects you to people near you — in real time. Because sometimes help isn&apos;t about
            who&apos;s in charge. It&apos;s about who&apos;s close.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition transform hover:scale-105"
          >
            Join the Community
          </Link>
          <button
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold text-lg hover:bg-blue-50 transition"
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

        <div className="grid md:grid-cols-3 gap-8 sm:gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <Icon className="w-8 h-8 text-blue-600" />
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
          Built for the moments that matter most.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {emergencyTypes.map((type) => (
            <div key={type.label} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 text-center hover:shadow-lg transition">
              <div className="text-4xl mb-3">{type.icon}</div>
              <h3 className="font-bold text-gray-900 mb-1">{type.label}</h3>
              <p className="text-sm text-gray-600">{type.description}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-500 text-sm italic">
          More emergency types coming soon.
        </p>
      </section>

      {/* Live Video Alerts */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-8 sm:p-12 text-white">
          <div className="flex items-start gap-4 mb-6">
            <Video className="w-8 h-8 flex-shrink-0 mt-1" />
            <div>
              <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm font-semibold mb-3">
                Coming Soon
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">Live Video Alerts</h3>
              <p className="text-lg text-white/90 leading-relaxed">
                Share real-time video during emergencies so nearby responders can understand the
                situation faster. We&apos;re building this feature with privacy and safety at its core.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Community Response */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
          Why Community Response Matters
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Emergency Services Take Time</h3>
            <p className="text-gray-600">
              They&apos;re vital, but they can&apos;t be everywhere instantly. Minutes matter in emergencies.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Communities Are Already There</h3>
            <p className="text-gray-600">
              Your neighbors, coworkers, and nearby people can help right now — if they know someone needs them.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Empowerment Through Connection</h3>
            <p className="text-gray-600">
              MiCall empowers people to help each other safely, building stronger, more resilient communities.
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
          Built on Trust
        </h2>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Shield className="w-6 h-6 text-blue-600 mt-1" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Location-Based Alerts</h4>
              <p className="text-gray-600">Only nearby users see your alert.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Shield className="w-6 h-6 text-blue-600 mt-1" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">No Public Broadcasting</h4>
              <p className="text-gray-600">Your emergency doesn&apos;t become public news.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Shield className="w-6 h-6 text-blue-600 mt-1" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Privacy First</h4>
              <p className="text-gray-600">We respect your data and your space.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Shield className="w-6 h-6 text-blue-600 mt-1" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Community Powered</h4>
              <p className="text-gray-600">No authorities. Just people helping people.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
          Be There for Someone.<br />
          <span className="text-blue-600">Know Someone Will Be There for You.</span>
        </h2>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Free. Community-powered. Built for real life.
        </p>
        <Link
          href="/signup"
          className="inline-block px-10 py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 transition transform hover:scale-105"
        >
          Sign Up & Join MiCall
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-center text-gray-600 text-sm">
          <p>© 2025 MiCall. Community-powered emergency response.</p>
        </div>
      </footer>
    </div>
  );
}
