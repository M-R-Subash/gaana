import React, { useState, useRef } from 'react';
import { useStudio } from '../context/StudioContext';
import { audioEngine } from '../audio/AudioEngine';
import {
  encodeAudioBufferToMp3,
  encodeAudioBufferToWav,
  triggerDownload,
} from '../audio/mp3Encoder';
import {
  X,
  Download,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  FileAudio,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { project, totalDuration } = useStudio();

  const [format, setFormat] = useState<'mp3_320' | 'mp3_192' | 'wav'>('mp3_320');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'idle' | 'rendering' | 'encoding' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const vocalTracks = project.tracks.filter((t) => t.type === 'vocal');
  const activeTracks = project.tracks.filter((t) =>
    project.tracks.some((tr) => tr.isSolo) ? t.isSolo : !t.isMuted
  );

  const handleStartExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setProgress(10);
    setStage('rendering');

    try {
      // Step 1: Render Multitrack in OfflineAudioContext
      await new Promise((r) => setTimeout(r, 50));
      const renderedBuffer = await audioEngine.renderMix(
        project.tracks,
        totalDuration,
        project.masterVolume
      );

      setStage('encoding');
      setProgress(50);

      // Step 2: Encode client-side into MP3 or WAV
      let resultBlob: Blob;
      if (format === 'wav') {
        resultBlob = encodeAudioBufferToWav(renderedBuffer);
        setProgress(100);
      } else {
        const kbps = format === 'mp3_320' ? 320 : 192;
        resultBlob = await encodeAudioBufferToMp3(renderedBuffer, kbps, (pct) => {
          setProgress(50 + Math.round(pct * 0.5));
        });
      }

      setExportedBlob(resultBlob);
      const url = URL.createObjectURL(resultBlob);
      setPreviewUrl(url);
      setStage('ready');
      setIsExporting(false);

      // Trigger automatic download immediately for seamless UX!
      const ext = format === 'wav' ? 'wav' : 'mp3';
      const safeName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      triggerDownload(resultBlob, `${safeName}_Master.${ext}`);
    } catch (err: unknown) {
      console.error('Export error:', err);
      setStage('error');
      setErrorMessage(err instanceof Error ? err.message : 'Export failed');
      setIsExporting(false);
    }
  };

  const handleManualDownload = () => {
    if (!exportedBlob) return;
    const ext = format === 'wav' ? 'wav' : 'mp3';
    const safeName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    triggerDownload(exportedBlob, `${safeName}_Master.${ext}`);
  };

  const handleTogglePreview = () => {
    if (!audioPreviewRef.current) return;
    if (isPreviewPlaying) {
      audioPreviewRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      audioPreviewRef.current.play();
      setIsPreviewPlaying(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      <div className="bg-studio-surface border-t sm:border border-studio-border rounded-t-3xl sm:rounded-2xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl animate-in fade-in duration-200">
        {/* Header */}
        <div className="h-14 px-5 border-b border-studio-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-zinc-100">
              Export Mixed Song
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-studio-hover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Summary Box */}
          <div className="p-3.5 rounded-xl bg-studio-card border border-studio-border text-xs space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Project Name:</span>
              <span className="font-semibold text-zinc-200 truncate max-w-[180px]">
                {project.name}
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Active Tracks in Mix:</span>
              <span className="font-mono text-zinc-200">
                {activeTracks.length} ({vocalTracks.length} vocals)
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Mix Duration:</span>
              <span className="font-mono text-zinc-200">
                {Math.floor(totalDuration / 60)}:
                {Math.floor(totalDuration % 60)
                  .toString()
                  .padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-xs font-bold text-zinc-200 mb-2">
              Select Audio Format:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'mp3_320', label: 'MP3 320k', sub: 'High Quality' },
                { id: 'mp3_192', label: 'MP3 192k', sub: 'Standard' },
                { id: 'wav', label: 'WAV 16-bit', sub: 'Lossless' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setFormat(opt.id as typeof format)}
                  disabled={isExporting}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    format === opt.id
                      ? 'bg-studio-card border-emerald-500 text-emerald-400 shadow-sm'
                      : 'bg-studio-surface border-studio-border text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <p className="text-xs font-bold">{opt.label}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Progress / Status Display */}
          {isExporting && (
            <div className="p-3.5 rounded-xl bg-studio-card border border-studio-border space-y-2">
              <div className="flex justify-between text-xs font-semibold text-zinc-300">
                <span>
                  {stage === 'rendering' ? 'Summing Multitrack Audio...' : 'Encoding Audio File...'}
                </span>
                <span className="font-mono text-emerald-400">{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-studio-bg overflow-hidden border border-studio-border">
                <div
                  style={{ width: `${progress}%` }}
                  className="h-full bg-emerald-500 transition-all duration-150"
                />
              </div>
            </div>
          )}

          {stage === 'error' && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{errorMessage || 'Failed to export audio'}</span>
            </div>
          )}

          {/* Master Preview & Instant Download Confirmation */}
          {stage === 'ready' && previewUrl && (
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Audio Master Exported Successfully!</span>
              </div>

              {/* Preview Player */}
              <div className="flex items-center gap-3 bg-studio-card p-2 rounded-xl border border-studio-border">
                <button
                  onClick={handleTogglePreview}
                  className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center flex-shrink-0 active:scale-95 transition-all"
                >
                  {isPreviewPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-zinc-200 truncate">
                    Preview Final Mix
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    Client-side in-memory master
                  </p>
                </div>
                <audio
                  ref={audioPreviewRef}
                  src={previewUrl}
                  onEnded={() => setIsPreviewPlaying(false)}
                  className="hidden"
                />
              </div>

              <button
                onClick={handleManualDownload}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Again ({format.toUpperCase()})</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-studio-border bg-studio-surface flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
          >
            {stage === 'ready' ? 'Close' : 'Cancel'}
          </button>

          {stage !== 'ready' && (
            <button
              onClick={handleStartExport}
              disabled={isExporting || project.tracks.length === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
            >
              <FileAudio className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Render & Download'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

