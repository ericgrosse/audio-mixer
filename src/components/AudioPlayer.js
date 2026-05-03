import { Pause, Play, RotateCcw, SlidersHorizontal, Upload } from 'lucide-react';
import { useEffect, useRef } from 'react';
import demoTrack from '../audio/Jurassic Park 2 The Chaos Continues - Dark Jungle (SNES OST).mp3';
import { useAudioEngine } from '../hooks/useAudioEngine';
import EffectsPanel from './EffectsPanel';
import PlaybackControls from './PlaybackControls';
import PresetControls from './PresetControls';
import Visualizer from './Visualizer';

const demoSliders = [
  { key: 'volume', min: 0, max: 1.5 },
  { key: 'speed', min: 0.25, max: 4 },
  { key: 'pitch', min: -12, max: 12 },
  { key: 'bass', min: -18, max: 18 },
  { key: 'mid', min: -18, max: 18 },
  { key: 'treble', min: -18, max: 18 },
  { key: 'pan', min: -1, max: 1 },
  { key: 'reverb', min: 0, max: 1 },
  { key: 'lowPass', min: 500, max: 20000 },
  { key: 'highPass', min: 20, max: 5000 }
];

const demoDragDuration = 900;
const demoPauseDuration = 260;
const demoDurationMs = 3000 + demoSliders.length * 3 * (demoDragDuration + demoPauseDuration) + 1200;

function AudioPlayer() {
  const engine = useAudioEngine();
  const cursorRef = useRef(null);
  const engineRef = useRef(engine);
  const demoStartedRef = useRef(false);

  engineRef.current = engine;

  const handleFileChange = (event) => {
    engine.loadFile(event.target.files?.[0]);
  };

  const isDemoVideo = new URLSearchParams(window.location.search).get('demoVideo') === '1';

  useEffect(() => {
    if (!isDemoVideo || demoStartedRef.current) {
      return undefined;
    }

    demoStartedRef.current = true;
    engine.loadUrl(demoTrack, 'Jurassic Park 2 The Chaos Continues - Dark Jungle (SNES OST).mp3');

    window.__audioMixerDemoDurationMs = demoDurationMs;

    const getSliderInput = (targetName) => {
      const target = document.querySelector(`[data-demo-target="${targetName}"]`);
      return target?.querySelector('input[type="range"]');
    };

    const moveCursorTo = (targetName) => {
      const target = document.querySelector(`[data-demo-target="${targetName}"]`);
      const cursor = cursorRef.current;

      if (!target || !cursor) {
        return;
      }

      const rect = target.getBoundingClientRect();
      cursor.style.transform = `translate(${rect.left + rect.width / 2}px, ${rect.top + rect.height / 2}px)`;
    };

    const moveCursorToSliderValue = (targetName, value) => {
      const input = getSliderInput(targetName);
      const cursor = cursorRef.current;

      if (!input || !cursor) {
        return;
      }

      const rect = input.getBoundingClientRect();
      const min = Number(input.min);
      const max = Number(input.max);
      const ratio = (value - min) / (max - min);
      const x = rect.left + Math.min(Math.max(ratio, 0), 1) * rect.width;
      const y = rect.top + rect.height / 2;
      cursor.style.transform = `translate(${x}px, ${y}px)`;
    };

    const clickCursor = () => {
      const cursor = cursorRef.current;
      if (!cursor) {
        return;
      }

      cursor.classList.remove('is-clicking');
      window.requestAnimationFrame(() => cursor.classList.add('is-clicking'));
    };

    const setDragging = (isDragging) => {
      cursorRef.current?.classList.toggle('is-dragging', isDragging);
    };

    const sleep = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

    const animateSlider = (slider, from, to) => {
      const startTime = performance.now();
      setDragging(true);

      return new Promise((resolve) => {
        const stepFrame = (now) => {
          const progress = Math.min((now - startTime) / demoDragDuration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const value = from + (to - from) * eased;
          engineRef.current.updateEffect(slider.key, value);
          moveCursorToSliderValue(slider.key, value);

          if (progress < 1) {
            window.requestAnimationFrame(stepFrame);
          } else {
            engineRef.current.updateEffect(slider.key, to);
            moveCursorToSliderValue(slider.key, to);
            setDragging(false);
            resolve();
          }
        };

        window.requestAnimationFrame(stepFrame);
      });
    };

    moveCursorTo('play');

    let isCancelled = false;

    window.__runAudioMixerDemo = async () => {
      const currentEngine = engineRef.current;
      window.__audioMixerDemoRecordingDataUrl = '';
      const currentValues = {
        volume: 0.85,
        speed: 1,
        pitch: 0,
        bass: 0,
        mid: 0,
        treble: 0,
        reverb: 0,
        pan: 0,
        lowPass: 20000,
        highPass: 20
      };
      currentEngine.resetEffects();
      moveCursorTo('play');
      clickCursor();
      await currentEngine.startRecording();
      await currentEngine.togglePlayback();

      await sleep(900);

      for (const slider of demoSliders) {
        if (isCancelled) {
          break;
        }

        const midpoint = (slider.min + slider.max) / 2;
        moveCursorToSliderValue(slider.key, currentValues[slider.key]);
        clickCursor();
        await sleep(demoPauseDuration);
        await animateSlider(slider, currentValues[slider.key], slider.min);
        currentValues[slider.key] = slider.min;
        await sleep(demoPauseDuration);
        await animateSlider(slider, currentValues[slider.key], slider.max);
        currentValues[slider.key] = slider.max;
        await sleep(demoPauseDuration);
        await animateSlider(slider, currentValues[slider.key], midpoint);
        currentValues[slider.key] = midpoint;
        await sleep(demoPauseDuration);
      }

      await sleep(300);
      window.__audioMixerDemoRecordingDataUrl = await engineRef.current.stopRecording();
    };
    window.__stopAudioMixerDemoRecording = () => {
      if (window.__audioMixerDemoRecordingDataUrl) {
        return Promise.resolve(window.__audioMixerDemoRecordingDataUrl);
      }
      return engineRef.current.stopRecording();
    };

    return () => {
      isCancelled = true;
      delete window.__runAudioMixerDemo;
      delete window.__stopAudioMixerDemoRecording;
      delete window.__audioMixerDemoDurationMs;
      delete window.__audioMixerDemoRecordingDataUrl;
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
                data-demo-target="play"
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

      {isDemoVideo && (
        <div className="demo-cursor" ref={cursorRef} aria-hidden="true">
          <svg viewBox="0 0 32 32" focusable="false">
            <path className="cursor-shadow" d="M5 2L25 20H14L10 30L6 28L10 19H5V2Z" />
            <path className="cursor-fill" d="M4 1L24 19H13L9 29L5 27L9 18H4V1Z" />
          </svg>
        </div>
      )}
    </section>
  );
}

export default AudioPlayer;
