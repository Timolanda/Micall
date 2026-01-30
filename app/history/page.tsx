'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Clock, AlertTriangle, Video, CheckCircle } from 'lucide-react';
// TODO: Import Supabase hooks for fetching history data

export default function HistoryPage() {
  // Stub data for now
  const [history] = useState([
    { 
      time: '2024-06-01 14:23', 
      type: 'SOS', 
      outcome: 'Resolved',
      description: 'Emergency alert activated - responder arrived within 3 minutes'
    },
    { 
      time: '2024-05-28 09:10', 
      type: 'Go Live', 
      outcome: 'Responder Dispatched',
      description: 'Video recording started - emergency contact notified'
    },
    { 
      time: '2024-05-25 16:45', 
      type: 'SOS', 
      outcome: 'Resolved',
      description: 'Medical emergency - ambulance dispatched'
    },
  ]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SOS':
        return <AlertTriangle size={20} className="text-red-400" />;
      case 'Go Live':
        return <Video size={20} className="text-blue-400" />;
      default:
        return <AlertTriangle size={20} className="text-yellow-400" />;
    }
  };

  const getOutcomeIcon = (outcome: string) => {
    if (outcome.includes('Resolved')) {
      return <CheckCircle size={16} className="text-green-400" />;
    }
    return <Clock size={16} className="text-yellow-400" />;
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Emergency History</h1>
          <p className="text-zinc-400">View your past emergency activations and outcomes</p>
        </div>

        {/* History Icon */}
        <div className="flex justify-center mb-8">
          <div className="bg-zinc-900 rounded-full p-6 shadow-lg border border-zinc-700">
            <Clock size={32} className="text-primary" />
          </div>
        </div>

        {/* History List */}
        <div className="bg-zinc-900 rounded-xl p-6 shadow-inner">
          <h2 className="text-xl font-semibold mb-6">Recent Emergencies</h2>
          <div className="space-y-4">
            {history.map((event, index) => (
              <div key={index} className="bg-zinc-800 rounded-lg p-6 border-l-4 border-primary">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(event.type)}
                    <div>
                      <h3 className="font-semibold text-lg">{event.type}</h3>
                      <p className="text-sm text-zinc-400">{event.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getOutcomeIcon(event.outcome)}
                    <span className={`text-sm font-medium ${
                      event.outcome.includes('Resolved') ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {event.outcome}
                    </span>
                  </div>
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  {event.description}
                </p>
              </div>
            ))}
          </div>

          {history.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No emergency history yet</p>
              <p className="text-sm">Your emergency activations will appear here</p>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 rounded-xl p-6 text-center border border-zinc-700">
            <div className="text-2xl font-bold text-white">{history.length}</div>
            <div className="text-sm text-zinc-400">Total Emergencies</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-6 text-center border border-zinc-700">
            <div className="text-2xl font-bold text-green-400">
              {history.filter(e => e.outcome.includes('Resolved')).length}
            </div>
            <div className="text-sm text-zinc-400">Resolved</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-6 text-center border border-zinc-700">
            <div className="text-2xl font-bold text-blue-400">
              {history.filter(e => e.type === 'Go Live').length}
            </div>
            <div className="text-sm text-zinc-400">Video Sessions</div>
          </div>
        </div>
      </div>
    </div>
  );
} 