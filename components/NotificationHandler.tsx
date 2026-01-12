'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  alertId: string;
  onJoinLive: () => void;
}

export default function NotificationHandler({ alertId, onJoinLive }: Props) {
  useEffect(() => {
    // Subscribe to new alerts
    const channel = supabase
      .channel(`notifications-${alertId}`)
      .on(
        'postgres_changes', // updated type
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          console.log('New alert received:', payload.new);
          // Auto-open live viewer
          onJoinLive();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [alertId, onJoinLive]);

  return null; // invisible component
}
