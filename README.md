# Web Audio Mixer

A browser-only audio mixer built with Create React App, JavaScript, React functional components, and the Web Audio API.

## Features

- Upload local audio files such as MP3, WAV, M4A, or OGG
- Play, pause, restart, and scrub through the current track
- Real-time Web Audio graph with `MediaElementSource`, `GainNode`, `BiquadFilterNode`, `ConvolverNode`, `StereoPannerNode`, and `AnalyserNode`
- Sliders for volume, playback speed from 0.25x to 4x, pitch shift in semitones, bass, mid EQ, treble, reverb, pan, low-pass, and high-pass
- Frequency visualizer
- Presets for Bass Boost, Radio, and Echo Room
- Reset button for all effects

## Important Pitch Note

The app keeps playback speed and pitch controls separate. Playback speed uses the audio element's `playbackRate` while browser pitch preservation is enabled. The pitch slider uses a lightweight dual delay-line pitch shifter controlled in semitones, so pitch can move up or down without changing track speed. True studio-grade pitch shifting usually requires an AudioWorklet phase vocoder or granular processor.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm start
```

Build for production:

```bash
npm run build
```

## Project Structure

```text
src/
  components/
    AudioPlayer.js
    EffectSlider.js
    EffectsPanel.js
    PlaybackControls.js
    PresetControls.js
    Visualizer.js
  hooks/
    useAudioEngine.js
  App.js
  index.js
  index.css
```
