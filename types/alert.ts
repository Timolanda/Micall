export type AlertStatus =
  | 'pending'
  | 'accepted'
  | 'live'
  | 'ended'
  | 'active';

export interface BaseAlert {
  id: number;
  lat: number;
  lng: number;
  type: string;
  message: string;
  created_at: string;
  status: AlertStatus;
  user_id: string;
  video_url?: string;
}

/**
 * Alert used in responder navigation & live mode
 */
export interface NavigationAlert extends BaseAlert {
  responders: string[]; // responder IDs
}
