'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { Users, UserPlus } from 'lucide-react';

interface Responder {
  user_id: string;
  user_type: string;
  joined_at: string;
}

interface Props {
  alertId: string | null;
}

export default function LiveRespondersList({ alertId }: Props) {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!alertId) {
      setResponders([]);
      return;
    }

    setLoading(true);

    // Fetch initial responders
    const fetchResponders = async () => {
      try {
        const { data, error } = await supabase
          .from('responder_presence')
          .select('user_id, user_type, joined_at')
          .eq('alert_id', Number(alertId))
          .eq('user_type', 'responder')
          .order('joined_at', { ascending: false });

        if (!error && data) {
          console.log(`👥 Fetched ${data.length} responders`);
          setResponders(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching responders:', err);
        setLoading(false);
      }
    };

    fetchResponders();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`live-responders-${alertId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'responder_presence',
          filter: `alert_id=eq.${alertId}`,
        },
        () => {
          console.log('📡 Real-time responder update');
          fetchResponders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [alertId]);

  if (!alertId) return null;

  return (
    <div className="absolute bottom-6 left-6 bg-black/90 backdrop-blur-md rounded-xl p-4 max-w-xs border border-green-500/30 shadow-lg shadow-green-500/20 z-50">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-6 h-6 bg-green-500/20 rounded-full">
          <Users size={16} className="text-green-400 animate-pulse" />
        </div>
        <span className="text-sm font-bold text-green-400">
          {loading ? 'Loading...' : `${responders.length} Responder${responders.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Responders List */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {responders.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-2">
            Waiting for responders...
          </div>
        ) : (
          responders.map((responder) => (
            <div
              key={responder.user_id}
              className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg hover:bg-green-500/20 transition"
            >
              <UserPlus size={14} className="text-green-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs text-green-300 truncate">
                  {responder.user_id.slice(0, 8)}...
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(responder.joined_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
