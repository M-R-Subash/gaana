import React, { useState, useRef, useEffect } from 'react';
import { useStudio } from '../context/StudioContext';
import {
  X,
  Upload,
  Music,
  FileText,
  Play,
  Pause,
  Trash2,
  Sparkles,
  CheckCircle2,
  Mic,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { DEMO_LYRICS } from '../audio/demoSong';

interface SongSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SongSetupModal: React.FC<SongSetupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    project,
    loadInstrumentalFile,
    loadDemoProject,
    setLyrics,
    audioDevices,
    selectedAudioDeviceId,
    setSelectedAudioDeviceId,
    refreshAudioDevices,
    echoCancellation,
    toggleEchoCancellation,
    noiseSuppression,
    toggleNoiseSuppression,
  } = useStudio();

  const [lyricsInput, setLyricsInput] = useState(project.lyrics);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      refreshAudioDevices();
    }
  }, [isOpen, refreshAudioDevices]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewAudioUrl(url);
      setIsPreviewPlaying(false);
    }
  };

  const handleTogglePreview = () => {
    if (!audioRef.current) return;
    if (isPreviewPlaying) {
      audioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      audioRef.current.play();
      setIsPreviewPlaying(true);
    }
  };

  const handleApply = async () => {
    setIsLoading(true);
    setStatusMessage('Loading audio into studio...');
    try {
      if (selectedFile) {
        await loadInstrumentalFile(selectedFile);
      }
      setLyrics(lyricsInput);
      setIsLoading(false);
      onClose();
    } catch (err) {
      console.error(err);
      setStatusMessage('Error decoding audio. Please try another MP3 or WAV file.');
      setIsLoading(false);
    }
  };

  const handleLoadDemo = async () => {
    setIsLoading(true);
    setStatusMessage('Generating demo backing song...');
    try {
      await loadDemoProject();
      setLyricsInput(DEMO_LYRICS);
      setIsLoading(false);
      onClose();
    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to generate demo track');
      setIsLoading(false);
    }
  };

  const instrumentalTrack = project.tracks.find((t) => t.type === 'instrumental');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      <div className="bg-studio-surface border-t sm:border border-studio-border rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in duration-200">
        {/* Header */}
        <div className="h-14 px-5 border-b border-studio-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-studio-cyan" />
            <h3 className="text-sm font-bold text-zinc-100">
              Song Setup & Instrumental
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-studio-hover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Quick Demo Option */}
          <div className="p-3.5 rounded-xl bg-studio-card border border-studio-border flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Want to test singing immediately?
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Load a demo backing song with chords, groove, and lyrics.
              </p>
            </div>
            <button
              onClick={handleLoadDemo}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 active:scale-95 transition-all flex-shrink-0"
            >
              Load Demo
            </button>
          </div>

          {/* Section 1: Instrumental Audio */}
          <div>
            <label className="block text-xs font-bold text-zinc-200 mb-2">
              1. Upload Karaoke / Instrumental Audio (MP3 or WAV)
            </label>

            {selectedFile || instrumentalTrack ? (
              <div className="p-3.5 rounded-xl bg-studio-card border border-studio-border flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={handleTogglePreview}
                    className="w-9 h-9 rounded-full bg-studio-cyan text-zinc-950 flex items-center justify-center flex-shrink-0 hover:bg-cyan-400 active:scale-95"
                  >
                    {isPreviewPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">
                      {selectedFile ? selectedFile.name : instrumentalTrack?.name}
                    </p>
                    <p className="text-[10px] text-studio-emerald flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      Audio ready
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-studio-cyan hover:underline px-2 py-1"
                  >
                    Replace
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewAudioUrl(null);
                    }}
                    className="p-1.5 text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-700 hover:border-studio-cyan rounded-xl p-6 text-center cursor-pointer bg-studio-card/50 transition-colors"
              >
                <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-zinc-300">
                  Tap to upload karaoke instrumental audio
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Supports MP3, WAV, M4A, AAC
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewAudioUrl && (
              <audio
                ref={audioRef}
                src={previewAudioUrl}
                onEnded={() => setIsPreviewPlaying(false)}
                className="hidden"
              />
            )}
          </div>

          {/* Section 2: Lyrics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-studio-cyan" />
                2. Lyrics (Paste or Upload .txt)
              </label>

              <label className="text-xs text-studio-cyan hover:underline cursor-pointer flex items-center gap-1">
                <Upload className="w-3 h-3" />
                <span>Upload .txt</span>
                <input
                  type="file"
                  accept=".txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const txt = ev.target?.result as string;
                        if (txt) setLyricsInput(txt);
                      };
                      reader.readAsText(f);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              value={lyricsInput}
              onChange={(e) => setLyricsInput(e.target.value)}
              placeholder="Paste song lyrics here... (Line breaks and spacing will be preserved)"
              rows={6}
              className="w-full p-3 rounded-xl bg-studio-card border border-studio-border text-zinc-100 font-sans text-xs sm:text-sm focus:outline-none focus:border-studio-cyan resize-none leading-relaxed"
            />
          </div>

          {/* Section 3: Microphone Device Picker */}
          <div>
            <label className="block text-xs font-bold text-zinc-200 mb-2 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-studio-cyan" />
              3. Vocal Microphone Input
            </label>

            {audioDevices.length > 0 ? (
              <select
                value={selectedAudioDeviceId}
                onChange={(e) => setSelectedAudioDeviceId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-studio-card border border-studio-border text-xs text-zinc-100 focus:outline-none focus:border-studio-cyan"
              >
                <option value="">Default Microphone</option>
                {audioDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.substring(0, 5)}`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-xl bg-studio-card border border-studio-border text-zinc-400 text-xs flex items-center justify-between">
                <span>Default System Microphone</span>
                <button
                  type="button"
                  onClick={refreshAudioDevices}
                  className="text-studio-cyan hover:underline text-[11px]"
                >
                  Scan Devices
                </button>
              </div>
            )}
          </div>

          {/* Section 4: Vocal Isolation & Noise Cancellation */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-studio-cyan" />
              4. Studio Noise Cancellation & Isolation
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Noise Cancellation Toggle Card */}
              <div
                onClick={toggleNoiseSuppression}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  noiseSuppression
                    ? 'bg-cyan-950/20 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                    : 'bg-studio-card/70 border-studio-border hover:border-zinc-700'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles
                      className={`w-3.5 h-3.5 ${
                        noiseSuppression ? 'text-cyan-400' : 'text-zinc-500'
                      }`}
                    />
                    <span className="text-xs font-semibold text-zinc-200">
                      Noise Cancellation
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                    Cuts AC, fans, computer hum & mic hiss with 80Hz rumble filter.
                  </p>
                </div>
                <div
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex-shrink-0 ${
                    noiseSuppression
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                >
                  {noiseSuppression ? 'ACTIVE' : 'OFF'}
                </div>
              </div>

              {/* Speaker Bleed Cancellation Card */}
              <div
                onClick={toggleEchoCancellation}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  echoCancellation
                    ? 'bg-emerald-950/20 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                    : 'bg-studio-card/70 border-studio-border hover:border-zinc-700'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {echoCancellation ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                    <span className="text-xs font-semibold text-zinc-200">
                      Speaker Bleed Filter
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                    Acoustic echo canceller. Prevents backing track from re-entering mic if singing with speakers.
                  </p>
                </div>
                <div
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex-shrink-0 ${
                    echoCancellation
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                >
                  {echoCancellation ? 'ACTIVE' : 'OFF'}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-zinc-400 bg-studio-card/40 border border-zinc-800/80 rounded-lg p-2 leading-relaxed">
              🎧 <strong className="text-zinc-300">Studio Tip:</strong> For true physical vocal isolation, wired headphones are recommended. If recording with phone or laptop speakers, keep both filters <strong className="text-cyan-400">ACTIVE</strong>.
            </p>
          </div>

          {statusMessage && (
            <p className="text-xs text-studio-amber text-center">
              {statusMessage}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-studio-border bg-studio-surface flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isLoading || (!selectedFile && !instrumentalTrack)}
            className="px-5 py-2.5 rounded-xl bg-studio-cyan hover:bg-cyan-400 text-zinc-950 text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            {isLoading ? 'Processing...' : 'Apply & Enter Studio'}
          </button>
        </div>
      </div>
    </div>
  );
};

