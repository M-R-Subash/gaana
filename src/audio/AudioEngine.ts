import { AudioTrack, AudioClip } from '../types/studio';
import { extractPeaks } from './waveformUtils';

export type TimeUpdateCallback = (currentTime: number) => void;
export type MeterUpdateCallback = (rms: number, peak: number) => void;
export type StatusUpdateCallback = (status: 'stopped' | 'playing' | 'recording' | 'paused') => void;

interface PlayingNodeInfo {
  source: AudioBufferSourceNode;
  gain: GainNode;
  trackId: string;
  clipId: string;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private status: 'stopped' | 'playing' | 'recording' | 'paused' = 'stopped';

  // Playback scheduling
  private playheadPosition = 0; // Current playhead in seconds
  private playbackStartCtxTime = 0; // ctx.currentTime when playback started
  private activeSourceNodes: PlayingNodeInfo[] = [];
  private trackGainNodes: Map<string, GainNode> = new Map();
  private animationFrameId: number | null = null;

  // Recording
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordStartTimelineTime = 0;
  private micAnalyser: AnalyserNode | null = null;
  private meterAnimFrameId: number | null = null;
  private isMonitoring = false;
  private monitorGain: GainNode | null = null;

  // Callbacks
  private onTimeUpdate: TimeUpdateCallback | null = null;
  private onMeterUpdate: MeterUpdateCallback | null = null;
  private onStatusUpdate: StatusUpdateCallback | null = null;

  // Master Gain
  private masterGain: GainNode | null = null;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setCallbacks(
    onTime: TimeUpdateCallback,
    onMeter: MeterUpdateCallback,
    onStatus: StatusUpdateCallback
  ) {
    this.onTimeUpdate = onTime;
    this.onMeterUpdate = onMeter;
    this.onStatusUpdate = onStatus;
  }

  public getStatus(): 'stopped' | 'playing' | 'recording' | 'paused' {
    return this.status;
  }

  public getCurrentPlayhead(): number {
    if (this.status === 'playing' || this.status === 'recording') {
      if (!this.ctx) return this.playheadPosition;
      return this.playheadPosition + (this.ctx.currentTime - this.playbackStartCtxTime);
    }
    return this.playheadPosition;
  }

  public seek(newTimeSeconds: number, tracks: AudioTrack[], maxDuration: number = 0) {
    const clampedTime = Math.max(0, maxDuration > 0 ? Math.min(newTimeSeconds, maxDuration) : newTimeSeconds);
    const wasPlaying = this.status === 'playing';

    if (this.status === 'recording') {
      // Don't seek while recording
      return;
    }

    this.stopPlaybackInternal();
    this.playheadPosition = clampedTime;
    this.onTimeUpdate?.(this.playheadPosition);

    if (wasPlaying) {
      this.play(tracks, maxDuration);
    }
  }

  /**
   * Starts synchronized multitrack playback.
   */
  public async play(tracks: AudioTrack[], maxDuration: number = 0) {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    if (this.status === 'playing') return;

    this.stopPlaybackInternal();

    // Determine solo status
    const hasSolo = tracks.some((t) => t.isSolo);

    this.playbackStartCtxTime = ctx.currentTime;
    const currentPlayhead = this.playheadPosition;

    tracks.forEach((track) => {
      // Setup track GainNode
      let gainNode = this.trackGainNodes.get(track.id);
      if (!gainNode) {
        gainNode = ctx.createGain();
        gainNode.connect(this.masterGain!);
        this.trackGainNodes.set(track.id, gainNode);
      }

      // Check track audibility
      let targetGain = track.volume;
      if (hasSolo) {
        targetGain = track.isSolo ? track.volume : 0;
      } else if (track.isMuted) {
        targetGain = 0;
      }
      gainNode.gain.setValueAtTime(targetGain, ctx.currentTime);

      // Schedule all clips on this track
      track.clips.forEach((clip) => {
        if (!clip.audioBuffer) return;

        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + clip.duration;

        // If playhead hasn't reached the end of this clip yet
        if (currentPlayhead < clipEnd) {
          const source = ctx.createBufferSource();
          source.buffer = clip.audioBuffer;
          source.connect(gainNode!);

          if (currentPlayhead <= clipStart) {
            // Clip starts in the future relative to playhead
            const delay = clipStart - currentPlayhead;
            const startCtx = ctx.currentTime + delay;
            const bufferOffset = clip.trimStart;
            const playDuration = clip.duration;
            source.start(startCtx, bufferOffset, playDuration);
          } else {
            // Playhead is already inside the clip
            const elapsedIntoClip = currentPlayhead - clipStart;
            const bufferOffset = clip.trimStart + elapsedIntoClip;
            const remainingDuration = clip.duration - elapsedIntoClip;
            source.start(ctx.currentTime, bufferOffset, remainingDuration);
          }

          this.activeSourceNodes.push({
            source,
            gain: gainNode!,
            trackId: track.id,
            clipId: clip.id,
          });
        }
      });
    });

    this.status = 'playing';
    this.onStatusUpdate?.('playing');
    this.startTimeLoop(maxDuration);
  }

  /**
   * Pauses playback.
   */
  public pause() {
    if (this.status !== 'playing') return;
    this.playheadPosition = this.getCurrentPlayhead();
    this.stopPlaybackInternal();
    this.status = 'paused';
    this.onStatusUpdate?.('paused');
    this.onTimeUpdate?.(this.playheadPosition);
  }

  /**
   * Stops playback and resets playhead to 0.
   */
  public stop() {
    this.stopPlaybackInternal();
    this.playheadPosition = 0;
    this.status = 'stopped';
    this.onStatusUpdate?.('stopped');
    this.onTimeUpdate?.(0);
  }

  private stopPlaybackInternal() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.activeSourceNodes.forEach((node) => {
      try {
        node.source.stop();
        node.source.disconnect();
      } catch {
        // Source already stopped
      }
    });
    this.activeSourceNodes = [];
  }

  private startTimeLoop(maxDuration: number) {
    const loop = () => {
      if (this.status !== 'playing' && this.status !== 'recording') return;

      const current = this.getCurrentPlayhead();
      this.onTimeUpdate?.(current);

      if (maxDuration > 0 && current >= maxDuration && this.status === 'playing') {
        this.stop();
        return;
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Dynamically updates track volume/mute/solo in real-time during playback.
   */
  public updateTrackMix(tracks: AudioTrack[]) {
    if (!this.ctx) return;
    const hasSolo = tracks.some((t) => t.isSolo);

    tracks.forEach((track) => {
      const gainNode = this.trackGainNodes.get(track.id);
      if (gainNode) {
        let targetGain = track.volume;
        if (hasSolo) {
          targetGain = track.isSolo ? track.volume : 0;
        } else if (track.isMuted) {
          targetGain = 0;
        }
        gainNode.gain.setTargetAtTime(targetGain, this.ctx!.currentTime, 0.02);
      }
    });
  }

  // ==========================================
  // MICROPHONE & RECORDING (STRICT DIGITAL ISOLATION)
  // ==========================================

  /**
   * Checks or requests microphone permission.
   */
  public async initMicrophone(): Promise<MediaStream> {
    if (this.mediaStream) {
      return this.mediaStream;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false, // Pure vocal capture without voice processing artifacts
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });
    this.mediaStream = stream;
    this.setupMicAnalyser(stream);
    return stream;
  }

  private setupMicAnalyser(stream: MediaStream) {
    const ctx = this.getAudioContext();
    const source = ctx.createMediaStreamSource(stream);

    // Live VU meter analyser
    this.micAnalyser = ctx.createAnalyser();
    this.micAnalyser.fftSize = 256;
    source.connect(this.micAnalyser);

    // Monitoring node (initially OFF to prevent speaker feedback)
    this.monitorGain = ctx.createGain();
    this.monitorGain.gain.value = 0;
    source.connect(this.monitorGain);
    this.monitorGain.connect(this.masterGain!);

    this.startMeterLoop();
  }

  public setMonitoring(enabled: boolean) {
    this.isMonitoring = enabled;
    if (this.monitorGain && this.ctx) {
      this.monitorGain.gain.setTargetAtTime(enabled ? 1.0 : 0.0, this.ctx.currentTime, 0.03);
    }
  }

  public getMonitoring(): boolean {
    return this.isMonitoring;
  }

  private startMeterLoop() {
    if (this.meterAnimFrameId !== null) return;
    const buffer = new Uint8Array(128);

    const updateMeter = () => {
      if (this.micAnalyser) {
        this.micAnalyser.getByteTimeDomainData(buffer);
        let sum = 0;
        let peak = 0;
        for (let i = 0; i < buffer.length; i++) {
          const norm = (buffer[i] - 128) / 128;
          const abs = Math.abs(norm);
          if (abs > peak) peak = abs;
          sum += norm * norm;
        }
        const rms = Math.sqrt(sum / buffer.length);
        this.onMeterUpdate?.(rms, peak);
      }
      this.meterAnimFrameId = requestAnimationFrame(updateMeter);
    };
    this.meterAnimFrameId = requestAnimationFrame(updateMeter);
  }

  /**
   * Starts recording the microphone input as an isolated layer while
   * playing the instrumental and existing tracks to the headphones.
   */
  public async startRecording(tracks: AudioTrack[], maxDuration: number = 0) {
    const stream = await this.initMicrophone();
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    this.recordedChunks = [];
    this.recordStartTimelineTime = this.getCurrentPlayhead();

    // Check supported MIME type
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    let selectedMime = '';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }

    this.mediaRecorder = selectedMime
      ? new MediaRecorder(stream, { mimeType: selectedMime })
      : new MediaRecorder(stream);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.start(100);

    // Simultaneously start multitrack playback
    this.stopPlaybackInternal();
    this.playbackStartCtxTime = ctx.currentTime;

    const hasSolo = tracks.some((t) => t.isSolo);
    const currentPlayhead = this.recordStartTimelineTime;

    tracks.forEach((track) => {
      let gainNode = this.trackGainNodes.get(track.id);
      if (!gainNode) {
        gainNode = ctx.createGain();
        gainNode.connect(this.masterGain!);
        this.trackGainNodes.set(track.id, gainNode);
      }

      let targetGain = track.volume;
      if (hasSolo) {
        targetGain = track.isSolo ? track.volume : 0;
      } else if (track.isMuted) {
        targetGain = 0;
      }
      gainNode.gain.setValueAtTime(targetGain, ctx.currentTime);

      track.clips.forEach((clip) => {
        if (!clip.audioBuffer) return;
        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + clip.duration;

        if (currentPlayhead < clipEnd) {
          const source = ctx.createBufferSource();
          source.buffer = clip.audioBuffer;
          source.connect(gainNode!);

          if (currentPlayhead <= clipStart) {
            const delay = clipStart - currentPlayhead;
            source.start(ctx.currentTime + delay, clip.trimStart, clip.duration);
          } else {
            const elapsed = currentPlayhead - clipStart;
            source.start(ctx.currentTime, clip.trimStart + elapsed, clip.duration - elapsed);
          }

          this.activeSourceNodes.push({
            source,
            gain: gainNode!,
            trackId: track.id,
            clipId: clip.id,
          });
        }
      });
    });

    this.status = 'recording';
    this.onStatusUpdate?.('recording');
    this.startTimeLoop(maxDuration);
  }

  /**
   * Stops recording, collects the captured microphone audio,
   * decodes it into an AudioBuffer, and returns the new AudioClip and startTime.
   */
  public stopRecording(): Promise<{ clip: AudioClip; startTime: number }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.status !== 'recording') {
        this.stopPlaybackInternal();
        this.status = 'stopped';
        this.onStatusUpdate?.('stopped');
        reject(new Error('Not currently recording'));
        return;
      }

      const recordStartTime = this.recordStartTimelineTime;
      const ctx = this.getAudioContext();

      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.recordedChunks, {
            type: this.mediaRecorder?.mimeType || 'audio/webm',
          });
          const arrayBuf = await blob.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuf);
          const peaks = extractPeaks(audioBuffer, 400);

          const clip: AudioClip = {
            id: 'clip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            startTime: recordStartTime,
            duration: audioBuffer.duration,
            trimStart: 0,
            trimEnd: 0,
            audioBuffer,
            blob,
            peaks,
          };

          this.stopPlaybackInternal();
          this.playheadPosition = recordStartTime + audioBuffer.duration;
          this.status = 'stopped';
          this.onStatusUpdate?.('stopped');
          this.onTimeUpdate?.(this.playheadPosition);

          resolve({ clip, startTime: recordStartTime });
        } catch (err) {
          this.stopPlaybackInternal();
          this.status = 'stopped';
          this.onStatusUpdate?.('stopped');
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  // ==========================================
  // FILE DECODING & HELPERS
  // ==========================================

  public async decodeAudioFile(file: File | Blob): Promise<AudioBuffer> {
    const ctx = this.getAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  }

  // ==========================================
  // OFFLINE MIX RENDERING (FOR INSTANT EXPORT)
  // ==========================================

  /**
   * Sums all active, unmuted tracks (or soloed tracks) into a single stereo AudioBuffer
   * using OfflineAudioContext. Respects track volume, pan, offsets, and trimming.
   */
  public async renderMix(
    tracks: AudioTrack[],
    totalDuration: number,
    masterVolume = 1.0
  ): Promise<AudioBuffer> {
    if (totalDuration <= 0) {
      throw new Error('Total duration must be greater than 0');
    }

    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(
      2,
      Math.ceil(sampleRate * totalDuration),
      sampleRate
    );

    const hasSolo = tracks.some((t) => t.isSolo);

    // Master limiter/gain
    const masterGainNode = offlineCtx.createGain();
    masterGainNode.gain.value = masterVolume;
    masterGainNode.connect(offlineCtx.destination);

    for (const track of tracks) {
      // Determine if track should be in mix
      let shouldInclude = false;
      if (hasSolo) {
        shouldInclude = track.isSolo;
      } else {
        shouldInclude = !track.isMuted;
      }

      if (!shouldInclude || track.volume <= 0) continue;

      const trackGain = offlineCtx.createGain();
      trackGain.gain.value = track.volume;

      // Stereo Panner
      if (track.pan !== 0 && offlineCtx.createStereoPanner) {
        const panner = offlineCtx.createStereoPanner();
        panner.pan.value = track.pan;
        trackGain.connect(panner);
        panner.connect(masterGainNode);
      } else {
        trackGain.connect(masterGainNode);
      }

      for (const clip of track.clips) {
        if (!clip.audioBuffer) continue;

        const source = offlineCtx.createBufferSource();
        source.buffer = clip.audioBuffer;
        source.connect(trackGain);

        const startTime = Math.max(0, clip.startTime);
        const bufferOffset = Math.max(0, clip.trimStart);
        const duration = Math.max(0, clip.duration);

        if (startTime < totalDuration) {
          source.start(startTime, bufferOffset, duration);
        }
      }
    }

    return await offlineCtx.startRendering();
  }
}

// Global audio engine singleton
export const audioEngine = new AudioEngine();

