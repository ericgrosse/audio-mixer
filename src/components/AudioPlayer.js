import { Pause, Play, RotateCcw, SlidersHorizontal, Upload } from 'lucide-react';
import { useEffect, useRef } from 'react';
import demoTrack from '../audio/Jurassic Park 2 The Chaos Continues - Dark Jungle (SNES OST).mp3';
import { useAudioEngine } from '../hooks/useAudioEngine';
import EffectsPanel from './EffectsPanel';
import PlaybackControls from './PlaybackControls';
import PresetControls from './PresetControls';
import Visualizer from './Visualizer';

function AudioPlayer() {
  const engine = useAudioEngine();
  const demoStartedRef = useRef(false);

  const handleFileChange = (event) => {
    engine.loadFile(event.target.files?.[0]);
  };

  useEffect(() => {
    const isDemoVideo = new URLSearchParams(window.location.search).get('demoVideo') === '1';
    if (!isDemoVideo || demoStartedRef.current) {
      return undefined;
    }

    demoStartedRef.current = true;
    engine.loadUrl(demoTrack, 'Jurassic Park 2 The Chaos Continues - Dark Jungle (SNES OST).mp3');

    const sequence = [
      { at: 3000, key: 'volume', value: 0.5 },
      { at: 6000, key: 'speed', value: 0.5 },
      { at: 9000, key: 'pitch', value: -7 },
      { at: 12000, key: 'pan', value: -1 },
      { at: 15000, key: 'pan', value: 1 },
      { at: 18000, key: 'pan', value: 0 },
      { at: 21000, key: 'reverb', value: 0.5 },
      { at: 24000, key: 'bass', value: 18 },
      { at: 27000, key: 'mid', value: -10 },
      { at: 30000, key: 'pitch', value: 3 },
      { at: 33000, key: 'lowPass', value: 500 },
      { at: 36000, key: 'lowPass', value: 20000 },
      { at: 39000, key: 'highPass', value: 1000 },
      { at: 42000, preset: { bass: 9, mid: 1.5, treble: 2, lowPass: 18000, highPass: 20, reverb: 0.05, pan: 0 } },
      { at: 45000, preset: { bass: -9, mid: 7, treble: -4, lowPass: 4200, highPass: 280, reverb: 0.02, pan: 0 } },
      { at: 48000, preset: { bass: 2, mid: -1, treble: 3, lowPass: 14500, highPass: 80, reverb: 0.65, pan: 0 } },
      { at: 51000, reset: true }
    ];

    const timers = sequence.map((step) => window.setTimeout(() => {
      if (step.reset) {
        engine.resetEffects();
      } else if (step.preset) {
        engine.applyPreset(step.preset);
      } else {
        engine.updateEffect(step.key, step.value);
      }
    }, step.at));

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, []);

  return (
    <section className="mixer-panel" aria-label="Audio mixer">
      <header className="mixer-header">
        <div>
          <p className="eyebrow">Web Audio Studio</p>
          <h1>Audio Mixer</h1>
        </div>
        <div className="status-pill">
          <SlidersHorizontal size={17} aria-hidden="true" />
          Live effects
        </div>
      </header>

      <div className="mixer-layout">
        <section className="left-pane" aria-label="Audio loading and playback">
          <div className="upload-strip">
            <label className="file-picker">
              <Upload size={18} aria-hidden="true" />
              <span>Choose audio</span>
              <input type="file" accept="audio/*" onChange={handleFileChange} />
            </label>
            <div className="file-name" title={engine.fileName || 'No audio selected'}>
              {engine.fileName || 'No audio selected'}
            </div>
          </div>

          <audio ref={engine.audioRef} src={engine.audioUrl} preload="metadata" />

          <div className="transport-card">
            <div className="transport-buttons">
              <button
                className="primary-button"
                type="button"
                onClick={engine.togglePlayback}
                disabled={!engine.audioUrl}
                aria-label={engine.isPlaying ? 'Pause audio' : 'Play audio'}
                title={engine.isPlaying ? 'Pause' : 'Play'}
              >
                {engine.isPlaying ? <Pause size={22} /> : <Play size={22} />}
                <span>{engine.isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={engine.restart}
                disabled={!engine.audioUrl}
                aria-label="Restart audio"
                title="Restart"
              >
                <RotateCcw size={20} />
              </button>
            </div>

            <PlaybackControls
              currentTime={engine.currentTime}
              duration={engine.duration}
              onBeginScrub={engine.beginScrub}
              onEndScrub={engine.endScrub}
              onSeek={engine.seek}
            />
          </div>

          <Visualizer levels={engine.levels} />

          <PresetControls
            onPreset={engine.applyPreset}
            onReset={engine.resetEffects}
          />
        </section>

        <EffectsPanel
          effects={engine.effects}
          onChange={engine.updateEffect}
        />
      </div>
    </section>
  );
}

export default AudioPlayer;
