import React from 'react';
import { Play, Download, Trash2 } from 'lucide-react';

const RecordingsList = () => {
  const recordings = [
    {
      id: 1,
      timestamp: '2024-03-10T15:30:00',
      duration: '02:15',
      size: '12.5 MB',
      status: 'uploaded'
    },
    {
      id: 2,
      timestamp: '2024-03-10T14:45:00',
      duration: '01:30',
      size: '8.2 MB',
      status: 'uploaded'
    }
  ];

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Emergency Recordings</h2>
      
      <div className="space-y-2">
        {recordings.map((recording) => (
          <div
            key={recording.id}
            className="p-4 bg-card rounded-lg border"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">{formatDate(recording.timestamp)}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Duration: {recording.duration}</span>
                  <span>Size: {recording.size}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-muted rounded-full">
                  <Play className="h-4 w-4" />
                </button>
                <button className="p-2 hover:bg-muted rounded-full">
                  <Download className="h-4 w-4" />
                </button>
                <button className="p-2 hover:bg-destructive/10 text-destructive rounded-full">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecordingsList; 