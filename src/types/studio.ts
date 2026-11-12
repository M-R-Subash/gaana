export interface AudioClip {
  id: string;
  startTime: number;     // Position in seconds on the timeline
  duration: number;      // Effective duration in seconds (after trim)
  trimStart: number;     // Seconds skipped from start of source buffer
  trimEnd: number;       // Seconds trimmed from end of source buffer
  audioBuffer: AudioBuffer;
  blob?: Blob;
  peaks: number[];       // Normalized peak data (-1 to 1 or 0 to 1) for waveform rendering
}

export interface AudioTrack {
  id: string;
  name: string;
  type: 'instrumental' | 'vocal';
  volume: number;        // 0.0 to 1.5
  isMuted: boolean;
  isSolo: boolean;
  pan: number;           // -1.0 (L) to 1.0 (R)
  clips: AudioClip[];
  color: string;
  isLocked?: boolean;
}

export interface ProjectData {
  id: string;
  name: string;
  createdAt: number;
  lyrics: string;
  tracks: AudioTrack[];
  bpm: number;
  masterVolume: number;
}

export type PlaybackStatus = 'stopped' | 'playing' | 'recording' | 'paused';

export type ActiveTab = 'timeline' | 'lyrics' | 'mixer';

export interface ExportProgress {
  isExporting: boolean;
  progress: number;      // 0 to 100
  stage: 'idle' | 'rendering' | 'encoding' | 'done' | 'error';
  errorMessage?: string;
  downloadUrl?: string;
  downloadFileName?: string;
}

