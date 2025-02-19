import React from 'react';
import { Eye, AlertTriangle } from 'lucide-react';

const LiveStreamsList = () => {
  const liveStreams = [
    {
      id: 1,
      userId: 'user123',
      location: 'Downtown Area',
      viewerCount: 245,
      duration: '00:15:30',
      isEmergency: true
    },
    {
      id: 2,
      userId: 'user456',
      location: 'Central Park',
      viewerCount: 89,
      duration: '00:05:12',
      isEmergency: false
    }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        Live Streams
        <span className="px-2 py-0.5 text-sm bg-red-500 text-white rounded-full">
          {liveStreams.length} Active
        </span>
      </h2>

      <div className="grid gap-4">
        {liveStreams.map((stream) => (
          <div
            key={stream.id}
            className={`p-4 rounded-lg border ${
              stream.isEmergency ? 'border-destructive bg-destructive/5' : 'bg-card'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {stream.isEmergency && (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                )}
                <span className="font-medium">
                  {stream.isEmergency ? 'Emergency Stream' : 'Live Stream'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span>{stream.viewerCount}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Location: {stream.location}
              </p>
              <p className="text-sm text-muted-foreground">
                Duration: {stream.duration}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg">
                Join Stream
              </button>
              {stream.isEmergency && (
                <button className="flex-1 bg-destructive text-destructive-foreground py-2 rounded-lg">
                  Respond
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveStreamsList; 