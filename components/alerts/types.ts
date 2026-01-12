export interface Alert {
  id: number;
  latitude: number; // ✅ add this
  longitude: number; // ✅ add this
  type: string;
  message: string;
  created_at: string;
  status: 'active' | 'ended';
  video_url?: string;
}
