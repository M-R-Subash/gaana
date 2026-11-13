import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { ProjectData, AudioTrack, AudioClip, PlaybackStatus, ActiveTab } from '../types/studio';
import { audioEngine } from '../audio/AudioEngine';
import { extractPeaks } from '../audio/waveformUtils';
import { createDemoInstrumentalBuffer, DEMO_LYRICS } from '../audio/demoSong';
import { requestScreenWakeLock, releaseScreenWakeLock, triggerHaptic } from '../utils/mobileUtils';

interface StudioContextType {
  project: ProjectData;
  playbackStatus: PlaybackStatus;
  currentTime: number;
  totalDuration: number;
  activeTab: ActiveTab;
  micRms: number;
  micPeak: number;
  isMonitoring: boolean;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoFollowPlayhead: boolean;
  canUndo: boolean;
  canRedo: boolean;
  selectedTrackId: string | null;
  zoomLevel: number; // Pixels per second (e.g. 20 to 100)
  countInEnabled: boolean;
  countInStep: number | null;
  audioDevices: MediaDeviceInfo[];
  selectedAudioDeviceId: string;

  // Actions
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedTrackId: (id: string | null) => void;
  setZoomLevel: (zoom: number) => void;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (timeSeconds: number) => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  toggleMonitoring: () => void;
  toggleEchoCancellation: () => void;
  setEchoCancellation: (enabled: boolean) => void;
  toggleNoiseSuppression: () => void;
  setNoiseSuppression: (enabled: boolean) => void;
  toggleAutoFollowPlayhead: () => void;
  toggleCountIn: () => void;
  setSelectedAudioDeviceId: (id: string) => void;
  refreshAudioDevices: () => Promise<void>;

  // Track operations
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackReverb: (trackId: string, reverb: number) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  setTrackPan: (trackId: string, pan: number) => void;
  renameTrack: (trackId: string, name: string) => void;
  deleteTrack: (trackId: string) => void;
  duplicateTrack: (trackId: string) => void;
  addEmptyVocalTrack: () => void;
  moveClip: (trackId: string, clipId: string, newStartTime: number) => void;
  nudgeClipOffset: (trackId: string, clipId: string, deltaSeconds: number) => void;
  trimClip: (trackId: string, clipId: string, trimStart: number, trimEnd: number) => void;
  splitClipAtPlayhead: (trackId: string) => void;

  // Project & Song Setup
  setProjectName: (name: string) => void;
  setLyrics: (lyrics: string) => void;
  loadInstrumentalFile: (file: File) => Promise<void>;
  loadDemoProject: () => Promise<void>;
  clearProject: () => void;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
}

const StudioContext = createContext<StudioContextType | null>(null);

const DEFAULT_PROJECT: ProjectData = {
  id: 'proj_' + Date.now(),
  name: 'New Recording Session',
  createdAt: Date.now(),
  lyrics: '',
  tracks: [],
  bpm: 120,
  masterVolume: 1.0,
};

const TRACK_COLORS = [
  '#06b6d4', // Cyan (Instrumental)
  '#38bdf8', // Sky Blue (Vocal 1)
  '#34d399', // Emerald (Vocal 2)
  '#fbbf24', // Amber (Harmony)
  '#f87171', // Red / Rose (Adlib)
  '#a78bfa', // Violet
  '#f472b6', // Pink
];

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [project, setProject] = useState<ProjectData>(DEFAULT_PROJECT);
  const [history, setHistory] = useState<ProjectData[]>([]);
  const [redoStack, setRedoStack] = useState<ProjectData[]>([]);

  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('stopped');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>('timeline');
  const [micRms, setMicRms] = useState<number>(0);
  const [micPeak, setMicPeak] = useState<number>(0);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [echoCancellation, setEchoCancellation] = useState<boolean>(true);
  const [noiseSuppression, setNoiseSuppression] = useState<boolean>(true);
  const [autoFollowPlayhead, setAutoFollowPlayhead] = useState<boolean>(true);
  const [countInEnabled, setCountInEnabled] = useState<boolean>(true);
  const [countInStep, setCountInStep] = useState<number | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceIdState] = useState<string>('');
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(40); // 40px per second on mobile

  const projectRef = useRef(project);
  projectRef.current = project;
  const countInTimeoutRef = useRef<number[]>([]);

  const refreshAudioDevices = useCallback(async () => {
    const devices = await audioEngine.getAvailableAudioDevices();
    setAudioDevices(devices);
  }, []);

  const setSelectedAudioDeviceId = useCallback((id: string) => {
    setSelectedAudioDeviceIdState(id);
    audioEngine.setSelectedDeviceId(id);
  }, []);

  const toggleCountIn = useCallback(() => {
    setCountInEnabled((prev) => !prev);
    triggerHaptic('light');
  }, []);

  const toggleAutoFollowPlayhead = useCallback(() => {
    setAutoFollowPlayhead((prev) => !prev);
    triggerHaptic('light');
  }, []);

  // Screen WakeLock: prevents mobile phone screen from dimming or locking while performing
  useEffect(() => {
    if (playbackStatus === 'playing' || playbackStatus === 'recording') {
      requestScreenWakeLock();
    } else {
      releaseScreenWakeLock();
    }
  }, [playbackStatus]);

  // Calculate project total duration
  const totalDuration = React.useMemo(() => {
    let max = 0;
    project.tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const end = clip.startTime + clip.duration;
        if (end > max) max = end;
      });
    });
    return Math.max(max, 30); // Default to at least 30 seconds
  }, [project.tracks]);

  // AudioEngine callbacks hookup
  useEffect(() => {
    audioEngine.setCallbacks(
      (time) => setCurrentTime(time),
      (rms, peak) => {
        setMicRms(rms);
        setMicPeak(peak);
      },
      (status) => setPlaybackStatus(status)
    );
  }, []);

  // Sync real-time mix changes to AudioEngine
  useEffect(() => {
    audioEngine.updateTrackMix(project.tracks);
  }, [project.tracks]);

  // Undo / Redo state management
  const pushHistory = useCallback((newProject: ProjectData) => {
    setHistory((prev) => [...prev.slice(-25), projectRef.current]);
    setRedoStack([]);
    setProject(newProject);
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [projectRef.current, ...prev]);
    setProject(previous);
  }, [history]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setRedoStack((prev) => prev.slice(1));
    setHistory((prev) => [...prev, projectRef.current]);
    setProject(next);
  }, [redoStack]);

  // ==========================================
  // PLAYBACK & RECORDING ACTIONS
  // ==========================================

  const play = useCallback(async () => {
    await audioEngine.play(projectRef.current.tracks, totalDuration);
  }, [totalDuration]);

  const pause = useCallback(() => {
    audioEngine.pause();
  }, []);

  const stop = useCallback(() => {
    countInTimeoutRef.current.forEach((t) => clearTimeout(t));
    countInTimeoutRef.current = [];
    setCountInStep(null);
    audioEngine.stop();
  }, []);

  const seek = useCallback((timeSeconds: number) => {
    audioEngine.seek(timeSeconds, projectRef.current.tracks, totalDuration);
  }, [totalDuration]);

  const toggleMonitoring = useCallback(() => {
    const next = !isMonitoring;
    setIsMonitoring(next);
    audioEngine.setMonitoring(next);
  }, [isMonitoring]);

  const toggleEchoCancellation = useCallback(() => {
    setEchoCancellation((prev) => {
      const next = !prev;
      audioEngine.setEchoCancellation(next);
      return next;
    });
  }, []);

  const setEchoCancellationExplicit = useCallback((enabled: boolean) => {
    setEchoCancellation(enabled);
    audioEngine.setEchoCancellation(enabled);
  }, []);

  const toggleNoiseSuppression = useCallback(() => {
    setNoiseSuppression((prev) => {
      const next = !prev;
      audioEngine.setNoiseSuppression(next);
      return next;
    });
  }, []);

  const setNoiseSuppressionExplicit = useCallback((enabled: boolean) => {
    setNoiseSuppression(enabled);
    audioEngine.setNoiseSuppression(enabled);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (countInEnabled) {
        countInTimeoutRef.current.forEach((t) => clearTimeout(t));
        countInTimeoutRef.current = [];

        setCountInStep(3);
        audioEngine.playCountInBeep(false);
        triggerHaptic('countdown');

        await new Promise<void>((resolve) => {
          const t1 = window.setTimeout(() => {
            setCountInStep(2);
            audioEngine.playCountInBeep(false);
            triggerHaptic('countdown');
          }, 1000);

          const t2 = window.setTimeout(() => {
            setCountInStep(1);
            audioEngine.playCountInBeep(false);
            triggerHaptic('countdown');
          }, 2000);

          const t3 = window.setTimeout(() => {
            setCountInStep(null);
            audioEngine.playCountInBeep(true);
            triggerHaptic('heavy');
            resolve();
          }, 3000);

          countInTimeoutRef.current = [t1, t2, t3];
        });
      } else {
        triggerHaptic('heavy');
      }

      await audioEngine.startRecording(projectRef.current.tracks, totalDuration);
    } catch (err) {
      setCountInStep(null);
      console.error('Failed to start recording:', err);
      alert('Microphone access is required to record vocals. Please grant mic permission.');
    }
  }, [countInEnabled, totalDuration]);

  const stopRecording = useCallback(async () => {
    try {
      const { clip } = await audioEngine.stopRecording();
      triggerHaptic('success');

      // Automatically create a new vocal track layer
      const vocalCount = projectRef.current.tracks.filter((t) => t.type === 'vocal').length + 1;
      const colorIndex = (vocalCount % (TRACK_COLORS.length - 1)) + 1;

      const newTrack: AudioTrack = {
        id: 'track_' + Date.now(),
        name: `Vocal ${vocalCount}`,
        type: 'vocal',
        volume: 1.0,
        isMuted: false,
        isSolo: false,
        pan: 0,
        clips: [clip],
        color: TRACK_COLORS[colorIndex],
      };

      const updated = {
        ...projectRef.current,
        tracks: [...projectRef.current.tracks, newTrack],
      };
      pushHistory(updated);
      setSelectedTrackId(newTrack.id);
    } catch (err) {
      console.error('Stop recording failed:', err);
    }
  }, [pushHistory]);

  // ==========================================
  // TRACK CONTROLS
  // ==========================================

  const setTrackVolume = useCallback((trackId: string, volume: number) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, volume } : t)),
    }));
  }, []);

  const setTrackReverb = useCallback((trackId: string, reverb: number) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, reverb: Math.max(0, Math.min(1, reverb)) } : t)),
    }));
  }, []);

  const toggleTrackMute = useCallback((trackId: string) => {
    triggerHaptic('light');
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, isMuted: !t.isMuted } : t)),
    }));
  }, []);

  const toggleTrackSolo = useCallback((trackId: string) => {
    triggerHaptic('light');
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, isSolo: !t.isSolo } : t)),
    }));
  }, []);

  const setTrackPan = useCallback((trackId: string, pan: number) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, pan } : t)),
    }));
  }, []);

  const renameTrack = useCallback((trackId: string, name: string) => {
    const updated = {
      ...projectRef.current,
      tracks: projectRef.current.tracks.map((t) => (t.id === trackId ? { ...t, name } : t)),
    };
    pushHistory(updated);
  }, [pushHistory]);

  const deleteTrack = useCallback((trackId: string) => {
    const updated = {
      ...projectRef.current,
      tracks: projectRef.current.tracks.filter((t) => t.id !== trackId),
    };
    pushHistory(updated);
    if (selectedTrackId === trackId) {
      setSelectedTrackId(null);
    }
  }, [pushHistory, selectedTrackId]);

  const duplicateTrack = useCallback((trackId: string) => {
    const trackToDup = projectRef.current.tracks.find((t) => t.id === trackId);
    if (!trackToDup) return;

    const dupTrack: AudioTrack = {
      ...trackToDup,
      id: 'track_' + Date.now(),
      name: `${trackToDup.name} (Copy)`,
      clips: trackToDup.clips.map((c) => ({
        ...c,
        id: 'clip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      })),
    };

    const updated = {
      ...projectRef.current,
      tracks: [...projectRef.current.tracks, dupTrack],
    };
    pushHistory(updated);
  }, [pushHistory]);

  const addEmptyVocalTrack = useCallback(() => {
    const vocalCount = projectRef.current.tracks.filter((t) => t.type === 'vocal').length + 1;
    const colorIndex = (vocalCount % (TRACK_COLORS.length - 1)) + 1;

    const newTrack: AudioTrack = {
      id: 'track_' + Date.now(),
      name: `Vocal ${vocalCount}`,
      type: 'vocal',
      volume: 1.0,
      isMuted: false,
      isSolo: false,
      pan: 0,
      clips: [],
      color: TRACK_COLORS[colorIndex],
    };

    const updated = {
      ...projectRef.current,
      tracks: [...projectRef.current.tracks, newTrack],
    };
    pushHistory(updated);
    setSelectedTrackId(newTrack.id);
  }, [pushHistory]);

  const moveClip = useCallback((trackId: string, clipId: string, newStartTime: number) => {
    const safeStart = Math.max(0, newStartTime);
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          clips: t.clips.map((c) => (c.id === clipId ? { ...c, startTime: safeStart } : c)),
        };
      }),
    }));
  }, []);

  const nudgeClipOffset = useCallback((trackId: string, clipId: string, deltaSeconds: number) => {
    const updated = {
      ...projectRef.current,
      tracks: projectRef.current.tracks.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          clips: t.clips.map((c) => {
            if (c.id !== clipId) return c;
            const newStart = Math.max(0, c.startTime + deltaSeconds);
            return { ...c, startTime: newStart };
          }),
        };
      }),
    };
    pushHistory(updated);
  }, [pushHistory]);

  const trimClip = useCallback((trackId: string, clipId: string, trimStart: number, trimEnd: number) => {
    const updated = {
      ...projectRef.current,
      tracks: projectRef.current.tracks.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          clips: t.clips.map((c) => {
            if (c.id !== clipId) return c;
            const maxDuration = c.audioBuffer.duration;
            const safeTrimStart = Math.max(0, Math.min(trimStart, maxDuration - 0.1));
            const safeTrimEnd = Math.max(0, Math.min(trimEnd, maxDuration - safeTrimStart - 0.1));
            const newDuration = maxDuration - safeTrimStart - safeTrimEnd;

            return {
              ...c,
              trimStart: safeTrimStart,
              trimEnd: safeTrimEnd,
              duration: newDuration,
            };
          }),
        };
      }),
    };
    pushHistory(updated);
  }, [pushHistory]);

  const splitClipAtPlayhead = useCallback((trackId: string) => {
    const track = projectRef.current.tracks.find((t) => t.id === trackId);
    if (!track) return;

    const playhead = audioEngine.getCurrentPlayhead();
    const clipToSplit = track.clips.find(
      (c) => playhead > c.startTime && playhead < c.startTime + c.duration
    );

    if (!clipToSplit) {
      alert('Playhead must be inside a clip to split it.');
      return;
    }

    const splitOffsetInClip = playhead - clipToSplit.startTime;
    const clip1Duration = splitOffsetInClip;
    const clip2Duration = clipToSplit.duration - splitOffsetInClip;

    const clip1: AudioClip = {
      ...clipToSplit,
      id: 'clip_' + Date.now() + '_a',
      duration: clip1Duration,
      trimEnd: clipToSplit.trimEnd + clip2Duration,
      peaks: extractPeaks(clipToSplit.audioBuffer, 200),
    };

    const clip2: AudioClip = {
      ...clipToSplit,
      id: 'clip_' + Date.now() + '_b',
      startTime: playhead,
      duration: clip2Duration,
      trimStart: clipToSplit.trimStart + splitOffsetInClip,
      peaks: extractPeaks(clipToSplit.audioBuffer, 200),
    };

    const updated = {
      ...projectRef.current,
      tracks: projectRef.current.tracks.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          clips: t.clips.flatMap((c) => (c.id === clipToSplit.id ? [clip1, clip2] : [c])),
        };
      }),
    };

    pushHistory(updated);
  }, [pushHistory]);

  // ==========================================
  // PROJECT & SONG SETUP ACTIONS
  // ==========================================

  const setProjectName = useCallback((name: string) => {
    setProject((prev) => ({ ...prev, name }));
  }, []);

  const setLyrics = useCallback((lyrics: string) => {
    setProject((prev) => ({ ...prev, lyrics }));
  }, []);

  const loadInstrumentalFile = useCallback(async (file: File) => {
    const audioBuffer = await audioEngine.decodeAudioFile(file);
    const peaks = extractPeaks(audioBuffer, 500);

    const instrumentalClip: AudioClip = {
      id: 'inst_clip_' + Date.now(),
      startTime: 0,
      duration: audioBuffer.duration,
      trimStart: 0,
      trimEnd: 0,
      audioBuffer,
      blob: file,
      peaks,
    };

    const instrumentalTrack: AudioTrack = {
      id: 'track_instrumental',
      name: file.name.replace(/\.[^/.]+$/, ''),
      type: 'instrumental',
      volume: 1.0,
      isMuted: false,
      isSolo: false,
      pan: 0,
      clips: [instrumentalClip],
      color: TRACK_COLORS[0],
    };

    const updated: ProjectData = {
      ...projectRef.current,
      name: file.name.replace(/\.[^/.]+$/, '') + ' Session',
      tracks: [
        instrumentalTrack,
        ...projectRef.current.tracks.filter((t) => t.type !== 'instrumental'),
      ],
    };

    pushHistory(updated);
  }, [pushHistory]);

  const loadDemoProject = useCallback(async () => {
    const ctx = audioEngine.getAudioContext();
    const demoBuffer = await createDemoInstrumentalBuffer(ctx);
    const peaks = extractPeaks(demoBuffer, 500);

    const instrumentalClip: AudioClip = {
      id: 'demo_inst_clip',
      startTime: 0,
      duration: demoBuffer.duration,
      trimStart: 0,
      trimEnd: 0,
      audioBuffer: demoBuffer,
      peaks,
    };

    const instrumentalTrack: AudioTrack = {
      id: 'track_instrumental_demo',
      name: 'Acoustic Groove (Demo Instrumental)',
      type: 'instrumental',
      volume: 0.9,
      isMuted: false,
      isSolo: false,
      pan: 0,
      clips: [instrumentalClip],
      color: TRACK_COLORS[0],
    };

    const demoProject: ProjectData = {
      id: 'proj_demo',
      name: 'Fly Me to the Moon (Karaoke)',
      createdAt: Date.now(),
      lyrics: DEMO_LYRICS,
      tracks: [instrumentalTrack],
      bpm: 96,
      masterVolume: 1.0,
    };

    pushHistory(demoProject);
  }, [pushHistory]);

  const clearProject = useCallback(() => {
    audioEngine.stop();
    setProject(DEFAULT_PROJECT);
    setHistory([]);
    setRedoStack([]);
    setSelectedTrackId(null);
  }, []);

  return (
    <StudioContext.Provider
      value={{
        project,
        playbackStatus,
        currentTime,
        totalDuration,
        activeTab,
        micRms,
        micPeak,
        isMonitoring,
        echoCancellation,
        noiseSuppression,
        autoFollowPlayhead,
        countInEnabled,
        countInStep,
        audioDevices,
        selectedAudioDeviceId,
        canUndo: history.length > 0,
        canRedo: redoStack.length > 0,
        selectedTrackId,
        zoomLevel,
        setActiveTab,
        setSelectedTrackId,
        setZoomLevel,
        play,
        pause,
        stop,
        seek,
        startRecording,
        stopRecording,
        toggleMonitoring,
        toggleEchoCancellation,
        setEchoCancellation: setEchoCancellationExplicit,
        toggleNoiseSuppression,
        setNoiseSuppression: setNoiseSuppressionExplicit,
        toggleAutoFollowPlayhead,
        toggleCountIn,
        setSelectedAudioDeviceId,
        refreshAudioDevices,
        setTrackVolume,
        setTrackReverb,
        toggleTrackMute,
        toggleTrackSolo,
        setTrackPan,
        renameTrack,
        deleteTrack,
        duplicateTrack,
        addEmptyVocalTrack,
        moveClip,
        nudgeClipOffset,
        trimClip,
        splitClipAtPlayhead,
        setProjectName,
        setLyrics,
        loadInstrumentalFile,
        loadDemoProject,
        clearProject,
        undo,
        redo,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};

