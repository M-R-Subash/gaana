# VocalStudio — Mobile Karaoke & Multitrack Vocal Recording Studio

A minimal, professional, mobile-first web application for recording, editing, layering, and mixing vocals over instrumental tracks with instant, client-side MP3/WAV download.

---

## 🎧 Architecture Highlights

- **100% Client-Side & Zero-Backend**: No accounts, no database, no server uploads. All audio processing, multitrack mixing, and MP3/WAV encoding occur entirely in browser memory.
- **Strict Digital Isolation**: The karaoke instrumental and previously recorded vocal layers play through `AudioContext.destination` to headphones, while the microphone input from `getUserMedia` routes strictly into `MediaRecorder`. There is zero software cross-talk or digital bleed between the backing track and the microphone recording.
- **Instant Browser Download**: Using `OfflineAudioContext` and `@breezystack/lamejs`, the multitrack mix is rendered in ~1–2 seconds and downloaded immediately as a `.mp3` or `.wav` file (`URL.createObjectURL`).
- **Mobile-First Studio Interface**:
  - Dark matte studio aesthetic (charcoal, slate, deep black `#0a0a0d`, with crisp electric cyan playhead, studio recording red, and amber indicators).
  - No generic purple AI gradients.
  - Finger-friendly 44px+ touch targets and bottom transport bar with safe-area support.
  - Three dedicated views: **Timeline & Waveforms**, **Karaoke Lyrics Prompter**, and **Multitrack Mixer Console**.
  - Independent, manual touch-scrollable lyrics prompter with font-size scaling (`A-` / `A+`).
  - High-performance HTML5 Canvas waveform rendering.
  - Clip alignment nudge buttons (`-50ms`, `+50ms`) for effortless mobile vocal timing alignment.
  - Split clip at playhead, trim, mute, solo, pan, and individual track volume faders.
  - Undo and Redo history stack.
  - 1-tap "Load Demo Song" with synthesized backing chords and lyrics for instant testing.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm 9+ or 10+

### Development
```bash
npm install
npm run dev
```

### Production Build & Preview
```bash
npm run build
npm run preview
```

---

## 📱 Mobile Workflow
1. **Setup**: Tap **Song Setup** to upload an instrumental MP3 and lyrics (or tap **Load Demo Backing Song** for instant testing).
2. **Sing & Record**: Tap **● RECORD** in the bottom transport bar. The instrumental plays into your headphones while your voice is captured cleanly as an isolated audio layer.
3. **Layer Harmonies**: Hit **● RECORD** again to add `Vocal 2`, harmonies, or adlibs on separate tracks.
4. **Edit & Sync**: Select any vocal track to nudge timing by `±50ms`, split at playhead, or adjust volume and pan.
5. **Prompting**: Switch to the **Lyrics** tab to scroll lyrics manually while singing without interrupting audio.
6. **Export**: Tap **Export** in the top header. Select **MP3 (320k / 192k)** or **WAV**, preview the master, and enjoy instant download directly to your device!

