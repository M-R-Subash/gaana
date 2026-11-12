import { Mp3Encoder } from '@breezystack/lamejs';

/**
 * Converts Float32 [-1.0 .. 1.0] to Int16 [-32768 .. 32767]
 */
function floatToInt16(float32Array: Float32Array): Int16Array {
  const len = float32Array.length;
  const int16 = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

/**
 * Encodes an AudioBuffer into an MP3 Blob entirely client-side.
 */
export async function encodeAudioBufferToMp3(
  audioBuffer: AudioBuffer,
  kbps: number = 192,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const channels = Math.min(2, audioBuffer.numberOfChannels);
  const sampleRate = audioBuffer.sampleRate;
  const mp3encoder = new Mp3Encoder(channels, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];

  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = channels > 1 ? audioBuffer.getChannelData(1) : leftChannel;

  const sampleBlockSize = 1152;
  const totalSamples = leftChannel.length;
  let offset = 0;

  while (offset < totalSamples) {
    const chunkLen = Math.min(sampleBlockSize, totalSamples - offset);
    const leftChunk = floatToInt16(leftChannel.subarray(offset, offset + chunkLen));
    const rightChunk = floatToInt16(rightChannel.subarray(offset, offset + chunkLen));

    let mp3buf: Int8Array | Uint8Array;
    if (channels === 1) {
      mp3buf = mp3encoder.encodeBuffer(leftChunk);
    } else {
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    }

    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }

    offset += chunkLen;

    if (onProgress && offset % (sampleBlockSize * 10) === 0) {
      onProgress(Math.round((offset / totalSamples) * 100));
      // Give breath to UI loop
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(new Uint8Array(mp3buf));
  }

  if (onProgress) {
    onProgress(100);
  }

  return new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
}

/**
 * Encodes an AudioBuffer into a standard 16-bit PCM WAV Blob client-side.
 */
export function encodeAudioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numOfChan = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  const channels: Float32Array[] = [];
  let sampleRate = audioBuffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);  // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16);         // length = 16
  setUint16(1);          // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2);             // block-align
  setUint16(16);                        // 16-bit precision

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  while (offset < audioBuffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([outBuffer], { type: 'audio/wav' });
}

/**
 * Triggers an instant download of a Blob file in the browser without uploading to any server.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
