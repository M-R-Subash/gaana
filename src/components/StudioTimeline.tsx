import React, { useRef, useState } from 'react';
import { useStudio } from '../context/StudioContext';
import { WaveformCanvas } from './WaveformCanvas';
import {
  Volume2,
  VolumeX,
  MoreVertical,
  Scissors,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Music,
  Plus,
} from 'lucide-react';

interface StudioTimelineProps {
  onOpenSetup: () => void;
}

export const StudioTimeline: React.FC<StudioTimelineProps> = ({ onOpenSetup }) => {
  const {
    project,
    currentTime,
    totalDuration,
    zoomLevel,
    seek,
    toggleTrackMute,
    toggleTrackSolo,
    setTrackVolume,
    deleteTrack,
    duplicateTrack,
    splitClipAtPlayhead,
    nudgeClipOffset,
    selectedTrackId,
    setSelectedTrackId,
    loadDemoProject,
  } = useStudio();

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const [openMenuTrackId, setOpenMenuTrackId] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const timelineWidth = Math.max(800, totalDuration * zoomLevel + 150);

  // Handle timeline click to seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickedSeconds = clickX / zoomLevel;
    seek(clickedSeconds);
  };

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickedSeconds = clickX / zoomLevel;
    seek(clickedSeconds);
  };

  const playheadLeft = currentTime * zoomLevel;

  // Ruler markers every 5 seconds
  const stepSeconds = zoomLevel < 30 ? 10 : 5;
  const markerCount = Math.ceil(totalDuration / stepSeconds) + 2;

  if (project.tracks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-studio-surface border border-studio-border flex items-center justify-center text-studio-cyan mb-4 shadow-lg">
          <Music className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-zinc-100 mb-1">
          Welcome to Vocal Studio
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mb-6 leading-relaxed">
          Upload an instrumental backing track or load the built-in demo song to start recording multiple vocal layers.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
          <button
            onClick={onOpenSetup}
            className="w-full py-2.5 px-4 rounded-xl bg-studio-cyan hover:bg-cyan-400 text-zinc-950 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Upload Karaoke Instrumental
          </button>

          <button
            onClick={loadDemoProject}
            className="w-full py-2.5 px-4 rounded-xl bg-studio-card hover:bg-studio-hover border border-studio-border text-zinc-200 font-semibold text-xs sm:text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Load Demo Backing Song
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-studio-bg select-none">
      {/* Clip Nudge / Edit Toolbar when a clip is selected */}
      {selectedTrackId && (
        <div className="bg-studio-surface/90 border-b border-studio-border px-3 py-1.5 flex items-center justify-between text-xs gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-400 font-medium">
              Vocal Timing Alignment:
            </span>
            <button
              onClick={() => {
                const track = project.tracks.find((t) => t.id === selectedTrackId);
                const clip = track?.clips.find((c) => c.id === selectedClipId) || track?.clips[0];
                if (clip) nudgeClipOffset(selectedTrackId, clip.id, -0.05);
              }}
              className="px-2 py-0.5 rounded bg-studio-card border border-studio-border text-zinc-200 hover:text-white active:scale-95 flex items-center gap-0.5"
              title="Nudge earlier by 50ms"
            >
              <ChevronLeft className="w-3 h-3" />
              <span>-50ms</span>
            </button>
            <button
              onClick={() => {
                const track = project.tracks.find((t) => t.id === selectedTrackId);
                const clip = track?.clips.find((c) => c.id === selectedClipId) || track?.clips[0];
                if (clip) nudgeClipOffset(selectedTrackId, clip.id, 0.05);
              }}
              className="px-2 py-0.5 rounded bg-studio-card border border-studio-border text-zinc-200 hover:text-white active:scale-95 flex items-center gap-0.5"
              title="Nudge later by 50ms"
            >
              <span>+50ms</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => splitClipAtPlayhead(selectedTrackId)}
              className="px-2 py-0.5 rounded bg-studio-card border border-studio-border text-zinc-300 hover:text-white active:scale-95 flex items-center gap-1"
              title="Split clip at playhead"
            >
              <Scissors className="w-3 h-3 text-studio-cyan" />
              <span>Split at Playhead</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Multitrack Scrollable Area */}
      <div
        ref={timelineContainerRef}
        className="flex-1 overflow-x-auto overflow-y-auto relative"
      >
        <div style={{ width: `${timelineWidth}px` }} className="min-w-full">
          {/* Timeline Ruler */}
          <div
            onClick={handleRulerClick}
            className="h-7 bg-studio-surface border-b border-studio-border sticky top-0 z-20 flex items-center cursor-pointer relative"
          >
            {Array.from({ length: markerCount }).map((_, i) => {
              const sec = i * stepSeconds;
              const left = sec * zoomLevel;
              const mins = Math.floor(sec / 60);
              const remainingSec = sec % 60;
              const timeLabel = `${mins}:${remainingSec.toString().padStart(2, '0')}`;

              return (
                <div
                  key={i}
                  style={{ left: `${left}px` }}
                  className="absolute top-0 bottom-0 flex flex-col justify-between pointer-events-none"
                >
                  <span className="text-[10px] text-zinc-500 font-mono pl-1">
                    {timeLabel}
                  </span>
                  <div className="w-[1px] h-2 bg-zinc-700" />
                </div>
              );
            })}

            {/* Playhead Head (Triangle marker on ruler) */}
            <div
              style={{ transform: `translateX(${playheadLeft}px)` }}
              className="absolute top-0 bottom-0 pointer-events-none z-30 transition-transform duration-75"
            >
              <div className="w-3 h-3 bg-studio-cyan -ml-1.5 rotate-45 transform origin-center shadow-md" />
            </div>
          </div>

          {/* Multitrack Workspace & Tracks */}
          <div
            onClick={handleTimelineClick}
            className="relative min-h-[300px] flex flex-col py-1"
          >
            {/* Playhead Needle Line (running across all tracks) */}
            <div
              style={{ transform: `translateX(${playheadLeft}px)` }}
              className="absolute top-0 bottom-0 w-[1.5px] bg-studio-cyan pointer-events-none z-20 shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-transform duration-75"
            />

            {/* Track Rows */}
            {project.tracks.map((track) => {
              const isSelected = selectedTrackId === track.id;

              return (
                <div
                  key={track.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTrackId(track.id);
                  }}
                  className={`relative my-1 mx-2 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-zinc-500 bg-studio-card/90 shadow-md'
                      : 'border-studio-border bg-studio-surface/60 hover:bg-studio-surface/90'
                  }`}
                >
                  {/* Track Info Header (Mobile-Friendly inline strip) */}
                  <div className="h-10 px-3 flex items-center justify-between border-b border-zinc-800/80 bg-studio-surface/70 rounded-t-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        style={{ backgroundColor: track.color }}
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      />
                      <span className="text-xs font-bold text-zinc-200 truncate max-w-[120px] sm:max-w-[180px]">
                        {track.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                          track.type === 'instrumental'
                            ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/40'
                            : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                        }`}
                      >
                        {track.type}
                      </span>
                    </div>

                    {/* Mute, Solo, Volume, Actions */}
                    <div className="flex items-center gap-1.5">
                      {/* Mute Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTrackMute(track.id);
                        }}
                        className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border transition-colors touch-press ${
                          track.isMuted
                            ? 'bg-red-500/20 border-red-500 text-red-400'
                            : 'bg-studio-bg border-studio-border text-zinc-400 hover:text-zinc-200'
                        }`}
                        title="Mute"
                      >
                        M
                      </button>

                      {/* Solo Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTrackSolo(track.id);
                        }}
                        className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border transition-colors touch-press ${
                          track.isSolo
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                            : 'bg-studio-bg border-studio-border text-zinc-400 hover:text-zinc-200'
                        }`}
                        title="Solo"
                      >
                        S
                      </button>

                      {/* Volume Slider */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 w-16 sm:w-20"
                      >
                        {track.volume === 0 || track.isMuted ? (
                          <VolumeX className="w-3 h-3 text-zinc-500" />
                        ) : (
                          <Volume2 className="w-3 h-3 text-zinc-400" />
                        )}
                        <input
                          type="range"
                          min="0"
                          max="1.5"
                          step="0.05"
                          value={track.volume}
                          onChange={(e) =>
                            setTrackVolume(track.id, parseFloat(e.target.value))
                          }
                          className="w-full h-1"
                        />
                      </div>

                      {/* Track Options Menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuTrackId(
                              openMenuTrackId === track.id ? null : track.id
                            );
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-white"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {openMenuTrackId === track.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-7 w-36 bg-studio-card border border-studio-border rounded-lg shadow-xl py-1 z-30 text-xs"
                          >
                            <button
                              onClick={() => {
                                duplicateTrack(track.id);
                                setOpenMenuTrackId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left text-zinc-300 hover:bg-studio-hover flex items-center gap-2"
                            >
                              <Copy className="w-3 h-3" />
                              Duplicate
                            </button>

                            <button
                              onClick={() => {
                                splitClipAtPlayhead(track.id);
                                setOpenMenuTrackId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left text-zinc-300 hover:bg-studio-hover flex items-center gap-2"
                            >
                              <Scissors className="w-3 h-3" />
                              Split at Playhead
                            </button>

                            <div className="border-t border-zinc-800 my-1" />

                            <button
                              onClick={() => {
                                if (
                                  confirm(`Delete track "${track.name}"?`)
                                ) {
                                  deleteTrack(track.id);
                                }
                                setOpenMenuTrackId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left text-red-400 hover:bg-red-950/30 flex items-center gap-2"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete Track
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Waveform & Clips Lane */}
                  <div className="h-16 relative bg-studio-bg/60 rounded-b-xl overflow-hidden">
                    {track.clips.map((clip) => {
                      const clipLeft = clip.startTime * zoomLevel;
                      const clipWidth = Math.max(20, clip.duration * zoomLevel);
                      const isClipSelected = selectedClipId === clip.id;

                      return (
                        <div
                          key={clip.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTrackId(track.id);
                            setSelectedClipId(clip.id);
                          }}
                          style={{
                            left: `${clipLeft}px`,
                            width: `${clipWidth}px`,
                          }}
                          className={`absolute top-1 bottom-1 rounded-md border flex items-center overflow-hidden cursor-pointer transition-all ${
                            isClipSelected
                              ? 'border-white bg-zinc-800/80 shadow-md ring-1 ring-white/50'
                              : 'border-zinc-700/60 bg-studio-surface/80 hover:border-zinc-500'
                          }`}
                        >
                          <WaveformCanvas
                            clip={clip}
                            color={track.color}
                            width={clipWidth}
                            height={52}
                            isSelected={isClipSelected}
                          />

                          {/* Clip Name pill */}
                          <div className="absolute top-1 left-1.5 text-[9px] font-mono px-1 rounded bg-black/60 text-zinc-300 backdrop-blur-sm pointer-events-none">
                            {clip.duration.toFixed(1)}s
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

