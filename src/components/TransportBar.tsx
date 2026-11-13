import React from 'react';
import { useStudio } from '../context/StudioContext';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Mic,
  Headphones,
  ZoomIn,
  ZoomOut,
  Timer,
  X,
} from 'lucide-react';

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const TransportBar: React.FC = () => {
  const {
    playbackStatus,
    currentTime,
    totalDuration,
    play,
    pause,
    stop,
    seek,
    startRecording,
    stopRecording,
    micPeak,
    isMonitoring,
    toggleMonitoring,
    zoomLevel,
    setZoomLevel,
    countInEnabled,
    toggleCountIn,
    countInStep,
    autoFollowPlayhead,
    toggleAutoFollowPlayhead,
  } = useStudio();

  const isRecording = playbackStatus === 'recording';
  const isPlaying = playbackStatus === 'playing';

  const handleRecordToggle = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  };

  const handleRewind = () => {
    seek(0);
  };

  // Convert mic peak (0.0 to 1.0) into 8 LED blocks
  const meterBlocks = 8;
  const activeBlocks = Math.round(micPeak * meterBlocks);

  return (
    <div className="bg-studio-surface border-t border-studio-border px-3 py-2 select-none flex-shrink-0 z-30 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Timecode & Zoom */}
        <div className="flex flex-col items-start min-w-[75px] sm:min-w-[95px]">
          <div className="font-mono text-xs sm:text-sm font-bold text-zinc-100 tracking-wider">
            {formatTime(currentTime)}
            <span className="text-zinc-500 font-normal text-[11px] ml-1">
              / {formatTime(totalDuration)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <button
              onClick={() => setZoomLevel(Math.max(15, zoomLevel - 10))}
              className="p-1 rounded bg-studio-bg border border-studio-border text-zinc-400 hover:text-zinc-100 touch-press"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] text-zinc-500 font-mono">
              {Math.round(zoomLevel)}px/s
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(120, zoomLevel + 10))}
              className="p-1 rounded bg-studio-bg border border-studio-border text-zinc-400 hover:text-zinc-100 touch-press"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={toggleAutoFollowPlayhead}
              className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono border transition-colors touch-press ${
                autoFollowPlayhead
                  ? 'bg-studio-cyan/20 border-studio-cyan text-studio-cyan'
                  : 'bg-studio-bg border-studio-border text-zinc-500'
              }`}
              title="Auto-scroll timeline to follow playhead"
            >
              Scroll
            </button>
          </div>
        </div>

        {/* Center: Main Transport Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Rewind to 0:00 */}
          <button
            onClick={handleRewind}
            disabled={isRecording}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-studio-card border border-studio-border flex items-center justify-center text-zinc-300 hover:text-white hover:bg-studio-hover active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
            title="Rewind to start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={handlePlayPause}
            disabled={isRecording}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md ${
              isPlaying
                ? 'bg-studio-cyan text-zinc-950 hover:bg-cyan-400'
                : 'bg-zinc-100 text-zinc-950 hover:bg-white'
            } disabled:opacity-30 disabled:pointer-events-none`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* 3-Second Count-In Toggle */}
          <button
            onClick={toggleCountIn}
            className={`hidden xs:flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-mono border transition-all touch-press ${
              countInEnabled
                ? 'bg-studio-cyan/20 border-studio-cyan text-studio-cyan'
                : 'bg-studio-bg border-studio-border text-zinc-500'
            }`}
            title="3-Second Count-In / Pre-Roll before Recording"
          >
            <Timer className="w-3 h-3" />
            <span>{countInEnabled ? '3s' : '0s'}</span>
          </button>

          {/* Big Recording Button */}
          <button
            onClick={handleRecordToggle}
            className={`relative flex items-center justify-center gap-1.5 px-4 h-11 sm:h-12 rounded-full font-bold text-xs sm:text-sm tracking-wide transition-all active:scale-95 shadow-md ${
              isRecording
                ? 'bg-red-600 text-white recording-glow'
                : 'bg-studio-card border border-red-500/40 text-red-400 hover:bg-red-950/30'
            }`}
            title={isRecording ? 'Stop Recording' : 'Start Vocal Recording'}
          >
            <div
              className={`w-3 h-3 rounded-full ${
                isRecording ? 'bg-white animate-pulse' : 'bg-red-500'
              }`}
            />
            <span>{isRecording ? 'STOP REC' : 'RECORD'}</span>
          </button>

          {/* Stop Button */}
          <button
            onClick={stop}
            disabled={isRecording}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-studio-card border border-studio-border flex items-center justify-center text-zinc-300 hover:text-white hover:bg-studio-hover active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
            title="Stop and reset"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>

        {/* Right: Mic VU Meter & Monitoring Toggle */}
        <div className="flex flex-col items-end min-w-[75px] sm:min-w-[95px]">
          {/* Live Mic Meter */}
          <div className="flex items-center gap-1">
            <Mic
              className={`w-3.5 h-3.5 ${
                micPeak > 0.05 ? 'text-studio-emerald animate-pulse' : 'text-zinc-500'
              }`}
            />
            {/* 8 LED segments */}
            <div className="flex items-center gap-0.5 h-3 bg-studio-bg px-1 py-0.5 rounded border border-studio-border">
              {Array.from({ length: meterBlocks }).map((_, i) => {
                const isActive = i < activeBlocks;
                const isRed = i >= 6;
                const isYellow = i >= 4 && i < 6;
                const colorClass = isRed
                  ? isActive
                    ? 'bg-red-500'
                    : 'bg-red-950/40'
                  : isYellow
                  ? isActive
                    ? 'bg-amber-400'
                    : 'bg-amber-950/40'
                  : isActive
                  ? 'bg-emerald-500'
                  : 'bg-emerald-950/40';

                return (
                  <span
                    key={i}
                    className={`w-1 h-2 rounded-[1px] ${colorClass} transition-colors`}
                  />
                );
              })}
            </div>
          </div>

          {/* Monitor Headphone Toggle */}
          <button
            onClick={toggleMonitoring}
            className={`flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors touch-press ${
              isMonitoring
                ? 'bg-studio-cyan/20 border-studio-cyan text-studio-cyan'
                : 'bg-studio-bg border-studio-border text-zinc-500 hover:text-zinc-300'
            }`}
            title={
              isMonitoring
                ? 'Monitoring active (Headphones required!)'
                : 'Monitoring off (Click to hear your voice live in headphones)'
            }
          >
            <Headphones className="w-2.5 h-2.5" />
            <span>{isMonitoring ? 'Mon On' : 'Mon Off'}</span>
          </button>
        </div>
      </div>

      {/* 3-2-1 Animated Pre-Roll Countdown Overlay */}
      {countInStep !== null && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center select-none animate-in fade-in duration-150">
          <div className="text-center space-y-4">
            <span className="text-xs uppercase font-mono tracking-widest text-zinc-400">
              Get Ready to Sing...
            </span>

            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-studio-cyan bg-studio-card flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-pulse">
              <span className="text-5xl sm:text-6xl font-mono font-black text-studio-cyan">
                {countInStep}
              </span>
            </div>

            <p className="text-xs text-zinc-400">
              Recording starts in {countInStep}s
            </p>

            <button
              onClick={stop}
              className="px-4 py-1.5 rounded-full bg-studio-surface border border-zinc-700 text-zinc-300 hover:text-white text-xs flex items-center gap-1.5 mx-auto touch-press"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

