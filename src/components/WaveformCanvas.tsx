import React, { useRef, useEffect } from 'react';
import { AudioClip } from '../types/studio';

interface WaveformCanvasProps {
  clip: AudioClip;
  color: string;
  width: number;
  height: number;
  isSelected?: boolean;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  clip,
  color,
  width,
  height,
  isSelected = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const peaks = clip.peaks || [];
    if (peaks.length === 0) {
      // Draw flat line if no peaks yet
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    const totalBufferDuration = clip.audioBuffer.duration;
    const trimStartPct = clip.trimStart / totalBufferDuration;
    const trimEndPct = clip.trimEnd / totalBufferDuration;
    const activeStartIdx = Math.floor(trimStartPct * peaks.length);
    const activeEndIdx = Math.min(peaks.length, Math.floor((1 - trimEndPct) * peaks.length));

    const activePeaks = peaks.slice(activeStartIdx, activeEndIdx);
    if (activePeaks.length === 0) return;

    const barWidth = Math.max(1.5, width / activePeaks.length);
    const midY = height / 2;
    const maxAmplitude = height * 0.42;

    // Draw background subtle center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // Draw waveform bars
    ctx.fillStyle = color;
    for (let i = 0; i < activePeaks.length; i++) {
      const peak = activePeaks[i];
      const x = i * (width / activePeaks.length);
      const barHeight = Math.max(2, peak * maxAmplitude * 2);
      const y = midY - barHeight / 2;

      ctx.fillRect(x, y, Math.max(1, barWidth - 0.5), barHeight);
    }

    // Selected border glow if active
    if (isSelected) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    }
  }, [clip, color, width, height, isSelected]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${width}px`, height: `${height}px` }}
      className="block pointer-events-none rounded"
    />
  );
};

