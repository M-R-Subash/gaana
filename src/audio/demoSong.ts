/**
 * Generates a pleasant, rhythmic demo instrumental track (chords, bassline, soft beat)
 * entirely client-side using Web Audio synthesis, so the user can test singing & recording instantly.
 */
export async function createDemoInstrumentalBuffer(ctx: BaseAudioContext): Promise<AudioBuffer> {
  const duration = 28; // 28 seconds of pleasant loop
  const sampleRate = ctx.sampleRate;
  const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  const bpm = 96;
  const beatSec = 60 / bpm;
  const barSec = beatSec * 4;

  // Chord progression: C - G - Am - F (in C major)
  // Frequencies (Hz):
  // C: C3(130.81), E3(164.81), G3(196.00), C4(261.63)
  // G: G2(98.00), B2(123.47), D3(146.83), G3(196.00)
  // Am: A2(110.00), C3(130.81), E3(164.81), A3(220.00)
  // F: F2(87.31), A2(110.00), C3(130.81), F3(174.61)

  const chords = [
    { bass: 65.41, notes: [130.81, 164.81, 196.00, 261.63] }, // C
    { bass: 49.00, notes: [98.00, 123.47, 146.83, 196.00] },  // G
    { bass: 55.00, notes: [110.00, 130.81, 164.81, 220.00] }, // Am
    { bass: 43.65, notes: [87.31, 110.00, 130.81, 174.61] },  // F
  ];

  const totalBars = Math.floor(duration / barSec);

  // Master compressor/limiter
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18, 0);
  compressor.knee.setValueAtTime(12, 0);
  compressor.ratio.setValueAtTime(4, 0);
  compressor.attack.setValueAtTime(0.003, 0);
  compressor.release.setValueAtTime(0.25, 0);
  compressor.connect(offlineCtx.destination);

  for (let bar = 0; bar < totalBars; bar++) {
    const chord = chords[bar % chords.length];
    const barStart = bar * barSec;

    // 1. Warm Bassline
    const bassOsc = offlineCtx.createOscillator();
    const bassGain = offlineCtx.createGain();
    const bassFilter = offlineCtx.createBiquadFilter();

    bassOsc.type = 'triangle';
    bassOsc.frequency.setValueAtTime(chord.bass, barStart);
    // Play on beats 1 and 3
    bassFilter.type = 'lowpass';
    bassFilter.frequency.setValueAtTime(250, barStart);

    bassGain.gain.setValueAtTime(0, barStart);
    bassGain.gain.linearRampToValueAtTime(0.35, barStart + 0.05);
    bassGain.gain.exponentialRampToValueAtTime(0.001, barStart + beatSec * 1.8);

    bassGain.gain.setValueAtTime(0, barStart + beatSec * 2);
    bassGain.gain.linearRampToValueAtTime(0.35, barStart + beatSec * 2 + 0.05);
    bassGain.gain.exponentialRampToValueAtTime(0.001, barStart + beatSec * 3.8);

    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(compressor);

    bassOsc.start(barStart);
    bassOsc.stop(barStart + barSec);

    // 2. Electric Piano / Synth Pad Chords
    chord.notes.forEach((freq, noteIdx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      const panner = offlineCtx.createStereoPanner ? offlineCtx.createStereoPanner() : null;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, barStart);

      // Stereo spread
      const panVal = ((noteIdx / (chord.notes.length - 1)) - 0.5) * 0.6;
      if (panner) panner.pan.setValueAtTime(panVal, barStart);

      // Rhythmic pulsing (strumming on every beat)
      for (let beat = 0; beat < 4; beat++) {
        const beatTime = barStart + beat * beatSec;
        gain.gain.setValueAtTime(0.001, beatTime);
        gain.gain.linearRampToValueAtTime(0.12, beatTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.015, beatTime + beatSec * 0.9);
      }

      if (panner) {
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(compressor);
      } else {
        osc.connect(gain);
        gain.connect(compressor);
      }

      osc.start(barStart);
      osc.stop(barStart + barSec);
    });

    // 3. Kick & Soft Snare Drum groove
    for (let beat = 0; beat < 4; beat++) {
      const beatTime = barStart + beat * beatSec;

      // Kick on 1 and 3
      if (beat === 0 || beat === 2) {
        const kickOsc = offlineCtx.createOscillator();
        const kickGain = offlineCtx.createGain();
        kickOsc.frequency.setValueAtTime(120, beatTime);
        kickOsc.frequency.exponentialRampToValueAtTime(35, beatTime + 0.12);

        kickGain.gain.setValueAtTime(0.4, beatTime);
        kickGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.18);

        kickOsc.connect(kickGain);
        kickGain.connect(compressor);
        kickOsc.start(beatTime);
        kickOsc.stop(beatTime + 0.2);
      }

      // Snare / Rimshot on 2 and 4
      if (beat === 1 || beat === 3) {
        // Noise burst for snare
        const bufferSize = offlineCtx.sampleRate * 0.1;
        const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, offlineCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = offlineCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = offlineCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, beatTime);

        const snareGain = offlineCtx.createGain();
        snareGain.gain.setValueAtTime(0.18, beatTime);
        snareGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.12);

        whiteNoise.connect(filter);
        filter.connect(snareGain);
        snareGain.connect(compressor);
        whiteNoise.start(beatTime);
        whiteNoise.stop(beatTime + 0.13);
      }
    }
  }

  return await offlineCtx.startRendering();
}

export const DEMO_LYRICS = `[Verse 1]
Fly me to the moon
Let me sing among the stars
Let me see what spring is like on
A-Jupiter and Mars

[Chorus]
In other words, hold my hand
In other words, baby, kiss me
Fill my heart with song
And let me sing forevermore

[Outro]
You are all I long for
All I worship and adore
In other words, please be true
In other words, I love you`;

