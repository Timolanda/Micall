'use client';
import { useState } from 'react';
import Modal from '../../components/Modal';

export default function LivePage() {
  const [countdown, setCountdown] = useState(3);
  const [micOn, setMicOn] = useState(true);
  const [cameraFront, setCameraFront] = useState(true);
  // TODO: Integrate video stream logic
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-6 p-4">
      {countdown > 0 && (
        <Modal>
          <div className="text-5xl font-bold text-danger animate-pulse-glow">{countdown}</div>
        </Modal>
      )}
      <div className="w-full max-w-md h-64 bg-zinc-900 rounded-lg flex items-center justify-center">
        {/* Video stream placeholder */}
        <span className="text-accent">[Video Stream]</span>
      </div>
      <div className="flex gap-4 mt-4">
        <button onClick={() => setMicOn((m) => !m)} className="bg-zinc-700 text-white px-4 py-2 rounded">
          {micOn ? 'Mic On' : 'Mic Off'}
        </button>
        <button onClick={() => setCameraFront((c) => !c)} className="bg-zinc-700 text-white px-4 py-2 rounded">
          {cameraFront ? 'Front Cam' : 'Back Cam'}
        </button>
      </div>
    </div>
  );
} 