/**
 * Extracts a compact array of peak values (0.0 to 1.0) from an AudioBuffer.
 * This allows instant 60fps rendering without looping over millions of samples each frame.
 */
export function extractPeaks(buffer: AudioBuffer, targetPeakCount = 400): number[] {
  const channelData = buffer.getChannelData(0);
  const totalSamples = channelData.length;
  const step = Math.max(1, Math.floor(totalSamples / targetPeakCount));
  const peaks: number[] = [];

  for (let i = 0; i < targetPeakCount; i++) {
    const start = i * step;
    const end = Math.min(start + step, totalSamples);
    let max = 0;

    for (let j = start; j < end; j++) {
      const val = Math.abs(channelData[j]);
      if (val > max) {
        max = val;
      }
    }
    peaks.push(Math.min(1, max));
  }

  return peaks;
}

