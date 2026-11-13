import React from 'react';
import { useStudio } from '../context/StudioContext';
import { Sliders, Volume2, VolumeX, Sparkles } from 'lucide-react';

export const MixerView: React.FC = () => {
  const {
    project,
    setTrackVolume,
    setTrackReverb,
    toggleTrackMute,
    toggleTrackSolo,
    setTrackPan,
  } = useStudio();

  if (project.tracks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none text-zinc-500">
        <Sliders className="w-12 h-12 mb-3 text-zinc-600" />
        <h3 className="text-sm font-semibold text-zinc-300 mb-1">
          Mixer Console Empty
        </h3>
        <p className="text-xs text-zinc-500">
          Upload an instrumental track or record vocals to mix levels.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-studio-bg overflow-hidden select-none">
      {/* Top Banner */}
      <div className="h-10 bg-studio-surface border-b border-studio-border px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-studio-cyan" />
          <span className="text-xs font-bold text-zinc-200">
            Multitrack Audio Mixer
          </span>
        </div>
        <span className="text-[11px] text-zinc-500 font-mono">
          {project.tracks.length} Channels Active
        </span>
      </div>

      {/* Horizontally Scrollable Channel Strips */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 flex items-stretch gap-3">
        {project.tracks.map((track) => {
          const isSolo = track.isSolo;
          const isMuted = track.isMuted;
          const volumePct = Math.round(track.volume * 100);

          return (
            <div
              key={track.id}
              className={`w-32 sm:w-36 flex-shrink-0 bg-studio-surface border rounded-2xl flex flex-col justify-between p-3 transition-all ${
                isSolo
                  ? 'border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                  : isMuted
                  ? 'border-zinc-800 opacity-60'
                  : 'border-studio-border shadow-sm'
              }`}
            >
              {/* Channel Header */}
              <div className="text-center pb-2 border-b border-zinc-800">
                <div
                  style={{ backgroundColor: track.color }}
                  className="w-2.5 h-2.5 rounded-full mx-auto mb-1"
                />
                <h4 className="text-xs font-bold text-zinc-200 truncate">
                  {track.name}
                </h4>
                <span className="text-[9px] font-mono uppercase text-zinc-500">
                  {track.type}
                </span>
              </div>

              {/* Fader & Meter Section */}
              <div className="flex-1 flex flex-col items-center justify-center my-3 gap-2">
                <span className="text-[11px] font-mono text-zinc-300 font-bold">
                  {volumePct}%
                </span>

                {/* Vertical Range Slider */}
                <div className="h-36 flex items-center justify-center relative py-2">
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={track.volume}
                    onChange={(e) =>
                      setTrackVolume(track.id, parseFloat(e.target.value))
                    }
                    className="w-32 -rotate-90 transform origin-center cursor-pointer"
                  />
                </div>

                {/* Pan Slider */}
                <div className="w-full flex flex-col items-center gap-1 mt-1">
                  <div className="flex justify-between w-full text-[9px] font-mono text-zinc-500 px-1">
                    <span>L</span>
                    <span>{track.pan === 0 ? 'C' : track.pan > 0 ? `R${Math.round(track.pan * 50)}` : `L${Math.round(Math.abs(track.pan) * 50)}`}</span>
                    <span>R</span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={track.pan}
                    onChange={(e) =>
                      setTrackPan(track.id, parseFloat(e.target.value))
                    }
                    className="w-full h-1"
                  />
                </div>

                {/* Studio Reverb Slider (Space FX) */}
                <div className="w-full flex flex-col items-center gap-0.5 mt-2 bg-studio-bg/60 p-1.5 rounded-lg border border-zinc-800">
                  <div className="flex justify-between w-full text-[9px] font-mono text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-studio-cyan" />
                      <span>Reverb</span>
                    </span>
                    <span className="text-zinc-300 font-bold">
                      {Math.round((track.reverb !== undefined ? track.reverb : (track.type === 'vocal' ? 0.2 : 0)) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={track.reverb !== undefined ? track.reverb : (track.type === 'vocal' ? 0.2 : 0)}
                    onChange={(e) =>
                      setTrackReverb(track.id, parseFloat(e.target.value))
                    }
                    className="w-full h-1"
                  />
                </div>
              </div>

              {/* Mute & Solo Buttons */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-zinc-800">
                <button
                  onClick={() => toggleTrackMute(track.id)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-colors touch-press flex items-center justify-center gap-1 ${
                    isMuted
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-studio-card border-studio-border text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  <span>M</span>
                </button>

                <button
                  onClick={() => toggleTrackSolo(track.id)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-colors touch-press ${
                    isSolo
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-studio-card border-studio-border text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  S
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

