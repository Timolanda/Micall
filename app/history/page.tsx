import { useState } from 'react';
// TODO: Import Supabase hooks for fetching history data

export default function HistoryPage() {
  // Stub data for now
  const [history] = useState([
    { time: '2024-06-01 14:23', type: 'SOS', outcome: 'Resolved' },
    { time: '2024-05-28 09:10', type: 'Go Live', outcome: 'Responder Dispatched' },
  ]);
  return (
    <div className="max-w-md mx-auto p-4 flex flex-col gap-6">
      <h2 className="text-xl font-bold mb-4">Emergency History</h2>
      <ul className="space-y-3">
        {history.map((e, i) => (
          <li key={i} className="bg-surface rounded-lg p-4 flex flex-col gap-1">
            <span className="text-sm text-zinc-400">{e.time}</span>
            <span className="font-bold">{e.type}</span>
            <span className="text-green-400">{e.outcome}</span>
          </li>
        ))}
      </ul>
    </div>
  );
} 