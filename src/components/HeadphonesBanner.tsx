import React, { useState } from 'react';
import { Headphones, X, ShieldCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { useStudio } from '../context/StudioContext';

export const HeadphonesBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const {
    echoCancellation,
    toggleEchoCancellation,
    noiseSuppression,
    toggleNoiseSuppression,
  } = useStudio();

  if (isDismissed) return null;

  return (
    <div className="bg-[#121217] border-b border-zinc-800 px-3 py-1.5 flex items-center justify-between text-[11px] text-zinc-300 select-none flex-shrink-0 gap-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <Headphones className="w-3.5 h-3.5 text-studio-cyan flex-shrink-0" />
        <span className="truncate">
          <strong className="text-zinc-100">Studio Tip:</strong> Wear headphones for 100% clean vocals without speaker bleed.
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Toggle Echo / Speaker Bleed Canceller */}
        <button
          onClick={toggleEchoCancellation}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors touch-press ${
            echoCancellation
              ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-400'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
          }`}
          title="Hardware Echo Cancellation: Cancels speaker bleed if singing without headphones"
        >
          {echoCancellation ? (
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-3 h-3 text-zinc-400" />
          )}
          <span>Bleed: {echoCancellation ? 'ON' : 'OFF'}</span>
        </button>

        {/* Toggle Ambient Noise Suppression */}
        <button
          onClick={toggleNoiseSuppression}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors touch-press ${
            noiseSuppression
              ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-400'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
          }`}
          title="Ambient Noise Cancellation: Filters room hum, fans, AC, and microphone hiss"
        >
          <Sparkles className="w-3 h-3" />
          <span>Noise Cancel: {noiseSuppression ? 'ON' : 'OFF'}</span>
        </button>

        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 text-zinc-500 hover:text-zinc-200"
          title="Dismiss tip"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
