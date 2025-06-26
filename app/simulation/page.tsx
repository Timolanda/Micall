'use client';
import { useState } from 'react';
import Modal from '../../components/Modal';
import { Play, Square, AlertTriangle } from 'lucide-react';

export default function SimulationPage() {
  const [testing, setTesting] = useState(false);
  
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Simulation Mode</h1>
          <p className="text-zinc-400">Test emergency response features safely</p>
        </div>

        {/* Simulation Icon */}
        <div className="flex justify-center mb-8">
          <div className="bg-zinc-900 rounded-full p-6 shadow-lg border border-zinc-700">
            <AlertTriangle size={32} className="text-yellow-400" />
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-zinc-900 rounded-xl p-8 shadow-inner text-center">
          <h2 className="text-xl font-semibold mb-6">Emergency Response Testing</h2>
          <p className="text-zinc-400 mb-8">
            Use this mode to test emergency features without triggering real alerts
          </p>
          
          <div className="flex flex-col items-center gap-6">
            <button
              className="w-40 h-40 rounded-full bg-zinc-700 text-white flex flex-col items-center justify-center animate-pulse border-4 border-primary hover:bg-zinc-600 transition-colors"
              onClick={() => setTesting(true)}
            >
              <Play size={48} className="mb-2" />
              <span className="text-lg font-semibold">Test Live</span>
            </button>
            
            <div className="text-sm text-zinc-500 max-w-md">
              This will simulate the emergency response workflow without sending real notifications
            </div>
          </div>
        </div>

        {/* Test Features List */}
        <div className="mt-8 bg-zinc-900 rounded-xl p-6 shadow-inner">
          <h3 className="text-lg font-semibold mb-4">What gets tested:</h3>
          <ul className="space-y-3 text-sm text-zinc-300">
            <li className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              Video recording and upload simulation
            </li>
            <li className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              Location sharing and mapping
            </li>
            <li className="flex items-center gap-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              Emergency contact notification system
            </li>
            <li className="flex items-center gap-3">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              Responder alert and dispatch workflow
            </li>
          </ul>
        </div>

        {testing && (
          <Modal onClose={() => setTesting(false)}>
            <div className="bg-zinc-900 p-8 rounded-xl w-full max-w-md text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                  <Play size={24} className="text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Simulating Live Mode...</h3>
                <p className="text-zinc-400">Emergency response system is being tested</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span>Recording video...</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Sharing location...</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span>Notifying contacts...</span>
                </div>
              </div>
              <button 
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                onClick={() => setTesting(false)}
              >
                <Square size={16} />
                End Simulation
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
} 