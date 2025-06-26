'use client';
import { useState } from 'react';
import Modal from '../../components/Modal';

export default function SimulationPage() {
  const [testing, setTesting] = useState(false);
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-8 p-4">
      <h1 className="text-2xl font-bold text-primary">Simulation Mode</h1>
      <button
        className="w-32 h-32 rounded-full bg-zinc-700 text-white text-2xl flex items-center justify-center animate-pulse border-4 border-primary"
        onClick={() => setTesting(true)}
      >
        Test Live
      </button>
      {testing && (
        <Modal>
          <div className="text-3xl font-bold text-accent mb-4">Simulating Live Mode...</div>
          <button className="mt-4 px-6 py-2 bg-primary text-white rounded" onClick={() => setTesting(false)}>
            End Simulation
          </button>
        </Modal>
      )}
    </div>
  );
} 