import React, { useRef, useState, useEffect } from 'react';
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
  GripHorizontal,
} from 'lucide-react';

interface StudioTimelineProps {
  onOpenSetup: () => void;
}

function formatTimeWithTenths(seconds: number): string {
  const s = Math.max(0, seconds);
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  const tenths = Math.floor((s % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
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
    moveClip,
    trimClip,
    selectedTrackId,
    setSelectedTrackId,
    loadDemoProject,
    addEmptyVocalTrack,
  } = useStudio();

  const rulerRef = useRef<HTMLDivElement | null>(null);
  const [openMenuTrackId, setOpenMenuTrackId] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // Playhead dragging state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPreviewTime, setScrubPreviewTime] = useState<number | null>(null);

  // Clip dragging state
  const draggingClipRef = useRef<{
    trackId: string;
    clipId: string;
    startX: number;
    initialStart: number;
  } | null>(null);

  const timelineWidth = Math.max(900, totalDuration * zoomLevel + 200);

  // ==========================================
  // PLAYHEAD SCRUBBER DRAG LOGIC
  // ==========================================

  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsScrubbing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const time = Math.max(0, Math.min(totalDuration, clickX / zoomLevel));
    setScrubPreviewTime(time);
    seek(time);
  };

  const handleRulerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const time = Math.max(0, Math.min(totalDuration, clickX / zoomLevel));
    setScrubPreviewTime(time);
    seek(time);
  };

  const handleRulerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsScrubbing(false);
      setScrubPreviewTime(null);
    }
  };

  // ==========================================
  // CLIP HORIZONTAL DRAG LOGIC
  // ==========================================

  const handleClipDragStart = (
    e: React.PointerEvent<HTMLDivElement>,
    trackId: string,
    clipId: string,
    currentStartTime: number
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedTrackId(trackId);
    setSelectedClipId(clipId);
    draggingClipRef.current = {
      trackId,
      clipId,
      startX: e.clientX,
      initialStart: currentStartTime,
    };
  };

  const handleClipDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingClipRef.current) return;
    const { trackId, clipId, startX, initialStart } = draggingClipRef.current;
    const deltaX = e.clientX - startX;
    const deltaSeconds = deltaX / zoomLevel;
    const newStart = Math.max(0, initialStart + deltaSeconds);
    moveClip(trackId, clipId, newStart);
  };

  const handleClipDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingClipRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      draggingClipRef.current = null;
    }
  };

  // ==========================================
  // CLIP EDGE TRIMMING LOGIC
  // ==========================================

  const trimmingClipRef = useRef<{
    trackId: string;
    clipId: string;
    edge: 'left' | 'right';
    startX: number;
    initialTrimStart: number;
    initialTrimEnd: number;
  } | null>(null);

  const handleTrimStart = (
    e: React.PointerEvent<HTMLDivElement>,
    trackId: string,
    clipId: string,
    edge: 'left' | 'right',
    trimStart: number,
    trimEnd: number
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedTrackId(trackId);
    setSelectedClipId(clipId);
    trimmingClipRef.current = {
      trackId,
      clipId,
      edge,
      startX: e.clientX,
      initialTrimStart: trimStart,
      initialTrimEnd: trimEnd,
    };
  };

  const handleTrimMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trimmingClipRef.current) return;
    const { trackId, clipId, edge, startX, initialTrimStart, initialTrimEnd } = trimmingClipRef.current;
    const deltaX = e.clientX - startX;
    const deltaSec = deltaX / zoomLevel;

    if (edge === 'left') {
      const newTrimStart = Math.max(0, initialTrimStart + deltaSec);
      trimClip(trackId, clipId, newTrimStart, initialTrimEnd);
    } else {
      const newTrimEnd = Math.max(0, initialTrimEnd - deltaSec);
      trimClip(trackId, clipId, initialTrimStart, newTrimEnd);
    }
  };

  const handleTrimEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (trimmingClipRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      trimmingClipRef.current = null;
    }
  };

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = () => setOpenMenuTrackId(null);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  const displayTime = isScrubbing && scrubPreviewTime !== null ? scrubPreviewTime : currentTime;
  const playheadLeft = displayTime * zoomLevel;

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
        <div className="bg-studio-surface/95 border-b border-studio-border px-3 py-1.5 flex items-center justify-between text-xs gap-2 flex-shrink-0 z-30">
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
              className="px-2 py-0.5 rounded bg-studio-card border border-studio-border text-zinc-200 hover:text-white active:scale-95 flex items-center gap-0.5 touch-press"
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
              className="px-2 py-0.5 rounded bg-studio-card border border-studio-border text-zinc-200 hover:text-white active:scale-95 flex items-center gap-0.5 touch-press"
              title="Nudge later by 50ms"
            >
              <span>+50ms</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => splitClipAtPlayhead(selectedTrackId)}
              className="px-2.5 py-0.5 rounded bg-studio-card border border-studio-border text-zinc-200 hover:text-white active:scale-95 flex items-center gap-1 touch-press"
              title="Split clip at playhead"
            >
              <Scissors className="w-3.5 h-3.5 text-studio-cyan" />
              <span>Split at Playhead</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Multitrack Timeline Area with Fixed Left Column and Scrollable Waveforms */}
      <div className="flex-1 overflow-x-auto overflow-y-auto relative flex flex-col">
        <div style={{ width: `${timelineWidth + 180}px` }} className="min-w-full flex flex-col">
          {/* TOP ROW: Sticky Header + Ruler */}
          <div className="h-9 flex border-b border-studio-border sticky top-0 z-40 bg-studio-surface">
            {/* Sticky Left Corner Header */}
            <div className="w-36 sm:w-44 flex-shrink-0 sticky left-0 z-50 bg-[#121217] border-r border-studio-border px-3 flex items-center justify-between shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Tracks ({project.tracks.length})
              </span>
              <button
                onClick={addEmptyVocalTrack}
                className="p-1 rounded bg-studio-card border border-studio-border text-studio-cyan hover:text-white active:scale-95"
                title="Add New Vocal Track"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Ruler Canvas & Interactive Playhead Scrubber */}
            <div
              ref={rulerRef}
              onPointerDown={handleRulerPointerDown}
              onPointerMove={handleRulerPointerMove}
              onPointerUp={handleRulerPointerUp}
              onPointerCancel={handleRulerPointerUp}
              style={{ width: `${timelineWidth}px` }}
              className="flex-1 h-full bg-[#121217] relative cursor-pointer select-none touch-none"
            >
              {/* Ruler time marks */}
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
                    <span className="text-[10px] text-zinc-500 font-mono pl-1 select-none">
                      {timeLabel}
                    </span>
                    <div className="w-[1px] h-2 bg-zinc-700" />
                  </div>
                );
              })}

              {/* Draggable Playhead Scrubber Thumb (Handle) */}
              <div
                style={{ transform: `translateX(${playheadLeft}px)` }}
                className="absolute top-0 bottom-0 pointer-events-none z-50 transition-none"
              >
                {/* Thumb Pill on Ruler */}
                <div className="absolute top-0.5 -left-3.5 w-7 h-7 bg-studio-cyan rounded-md shadow-[0_2px_8px_rgba(6,182,212,0.8)] border border-cyan-200 flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto">
                  <div className="flex flex-col gap-0.5 items-center justify-center pointer-events-none">
                    <span className="w-2.5 h-[1.5px] bg-zinc-950 rounded-full" />
                    <span className="w-2.5 h-[1.5px] bg-zinc-950 rounded-full" />
                    <span className="w-2.5 h-[1.5px] bg-zinc-950 rounded-full" />
                  </div>
                </div>

                {/* Floating Timecode Badge when scrubbing */}
                {isScrubbing && (
                  <div className="absolute -top-7 -left-7 px-1.5 py-0.5 rounded bg-cyan-400 text-zinc-950 text-[10px] font-mono font-bold shadow-lg pointer-events-none whitespace-nowrap">
                    {formatTimeWithTenths(displayTime)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TRACKS WORKSPACE */}
          <div className="relative flex flex-col">
            {/* Playhead Vertical Needle Line (runs down across all tracks) */}
            <div
              style={{
                left: `${144 + playheadLeft}px`, // 144px is left column width (w-36)
                transform: 'none',
              }}
              className="absolute top-0 bottom-0 w-[1.5px] bg-studio-cyan pointer-events-none z-20 shadow-[0_0_8px_rgba(6,182,212,0.9)] transition-none sm:left-[176px]"
            />

            {project.tracks.map((track) => {
              const isSelected = selectedTrackId === track.id;
              const isSolo = track.isSolo;
              const isMuted = track.isMuted;
              const volumePct = Math.round(track.volume * 100);

              return (
                <div
                  key={track.id}
                  onClick={() => setSelectedTrackId(track.id)}
                  className={`h-20 flex border-b transition-colors relative ${
                    isSelected
                      ? 'border-zinc-600 bg-studio-card/80'
                      : 'border-zinc-800/80 bg-studio-surface/40 hover:bg-studio-surface/70'
                  }`}
                >
                  {/* FIXED & STICKY LEFT TRACK CONTROL PANEL (Always visible on screen!) */}
                  <div className="w-36 sm:w-44 flex-shrink-0 sticky left-0 z-30 bg-[#14141a] border-r border-studio-border p-2 flex flex-col justify-between shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                    {/* Row 1: Track Color, Name, Menu */}
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          style={{ backgroundColor: track.color }}
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                        />
                        <span className="text-xs font-bold text-zinc-100 truncate">
                          {track.name}
                        </span>
                      </div>

                      {/* Options menu */}
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
                            className="absolute left-0 top-6 w-36 bg-studio-card border border-studio-border rounded-lg shadow-2xl py-1 z-50 text-xs"
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
                              <Scissors className="w-3 h-3 text-studio-cyan" />
                              Split Playhead
                            </button>

                            <div className="border-t border-zinc-800 my-1" />

                            <button
                              onClick={() => {
                                if (confirm(`Delete track "${track.name}"?`)) {
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

                    {/* Row 2: Mute & Solo Buttons + Type Tag */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        {/* Mute Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTrackMute(track.id);
                          }}
                          className={`w-6 h-5 rounded flex items-center justify-center text-[10px] font-bold border transition-colors touch-press ${
                            isMuted
                              ? 'bg-red-600 border-red-500 text-white shadow-sm'
                              : 'bg-studio-bg border-studio-border text-zinc-400 hover:text-zinc-200'
                          }`}
                          title="Mute Track"
                        >
                          M
                        </button>

                        {/* Solo Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTrackSolo(track.id);
                          }}
                          className={`w-6 h-5 rounded flex items-center justify-center text-[10px] font-bold border transition-colors touch-press ${
                            isSolo
                              ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-sm'
                              : 'bg-studio-bg border-studio-border text-zinc-400 hover:text-zinc-200'
                          }`}
                          title="Solo Track"
                        >
                          S
                        </button>
                      </div>

                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase ${
                          track.type === 'instrumental'
                            ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/40'
                            : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                        }`}
                      >
                        {track.type}
                      </span>
                    </div>

                    {/* Row 3: Volume Slider & Readout */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5"
                    >
                      {track.volume === 0 || isMuted ? (
                        <VolumeX className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                      ) : (
                        <Volume2 className="w-3 h-3 text-zinc-400 flex-shrink-0" />
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
                      <span className="text-[9px] font-mono text-zinc-400 w-7 text-right flex-shrink-0">
                        {volumePct}%
                      </span>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: WAVEFORM & CLIPS TIMELINE LANE */}
                  <div
                    style={{ width: `${timelineWidth}px` }}
                    className="h-full relative bg-studio-bg/40 overflow-hidden flex-1"
                  >
                    {track.clips.map((clip) => {
                      const clipLeft = clip.startTime * zoomLevel;
                      const clipWidth = Math.max(24, clip.duration * zoomLevel);
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
                          className={`absolute top-1.5 bottom-1.5 rounded-lg border flex flex-col overflow-hidden transition-all shadow-sm ${
                            isClipSelected
                              ? 'border-white bg-zinc-800/95 ring-1 ring-white/60 z-10'
                              : 'border-zinc-700/60 bg-[#16161f]/90 hover:border-zinc-500'
                          }`}
                        >
                          {/* Draggable Clip Header Bar */}
                          <div
                            onPointerDown={(e) =>
                              handleClipDragStart(e, track.id, clip.id, clip.startTime)
                            }
                            onPointerMove={handleClipDragMove}
                            onPointerUp={handleClipDragEnd}
                            onPointerCancel={handleClipDragEnd}
                            className="h-4 bg-zinc-900/90 border-b border-zinc-800 px-1 flex items-center justify-between cursor-grab active:cursor-grabbing touch-none select-none"
                            title="Drag horizontally to re-align vocal timing"
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              <GripHorizontal className="w-2.5 h-2.5 text-zinc-400 flex-shrink-0" />
                              <span className="text-[9px] font-mono text-zinc-300 truncate">
                                {clip.duration.toFixed(1)}s
                              </span>
                            </div>
                            <span className="text-[8px] font-mono text-zinc-500">
                              {clip.startTime.toFixed(2)}s
                            </span>
                          </div>

                          {/* Waveform Canvas */}
                          <div className="flex-1 relative overflow-hidden">
                            <WaveformCanvas
                              clip={clip}
                              color={track.color}
                              width={clipWidth}
                              height={46}
                              isSelected={isClipSelected}
                            />

                            {/* Left Trim Handle */}
                            <div
                              onPointerDown={(e) =>
                                handleTrimStart(e, track.id, clip.id, 'left', clip.trimStart, clip.trimEnd)
                              }
                              onPointerMove={handleTrimMove}
                              onPointerUp={handleTrimEnd}
                              onPointerCancel={handleTrimEnd}
                              className="absolute left-0 top-0 bottom-0 w-2.5 bg-zinc-600/40 hover:bg-studio-cyan/80 active:bg-studio-cyan cursor-ew-resize flex items-center justify-center touch-none z-10 transition-colors"
                              title="Drag to trim start of vocal clip"
                            >
                              <div className="w-[1.5px] h-3 bg-white/70 rounded-full" />
                            </div>

                            {/* Right Trim Handle */}
                            <div
                              onPointerDown={(e) =>
                                handleTrimStart(e, track.id, clip.id, 'right', clip.trimStart, clip.trimEnd)
                              }
                              onPointerMove={handleTrimMove}
                              onPointerUp={handleTrimEnd}
                              onPointerCancel={handleTrimEnd}
                              className="absolute right-0 top-0 bottom-0 w-2.5 bg-zinc-600/40 hover:bg-studio-cyan/80 active:bg-studio-cyan cursor-ew-resize flex items-center justify-center touch-none z-10 transition-colors"
                              title="Drag to trim end of vocal clip"
                            >
                              <div className="w-[1.5px] h-3 bg-white/70 rounded-full" />
                            </div>
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
