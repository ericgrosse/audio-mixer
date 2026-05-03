import { useCallback, useEffect, useRef, useState } from 'react';

export const defaultEffects = {
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

const buildImpulseResponse = (audioContext, duration = 2.4, decay = 2.8) => {
  const sampleRate = audioContext.sampleRate;
  const length = sampleRate * duration;
  const impulse = audioContext.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }

  return impulse;
};

const getPitchRate = (semitones) => Math.pow(2, semitones / 12);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildModulationBuffer = (audioContext, duration, getValue) => {
  const length = Math.max(2, Math.floor(audioContext.sampleRate * duration));
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i += 1) {
    data[i] = getValue(i / length);
  }

  return buffer;
};

const createLoopingSource = (audioContext, buffer) => {
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
};

const createPitchShifter = (audioContext) => {
  const input = audioContext.createGain();
  const output = audioContext.createGain();
  const dryGain = audioContext.createGain();
  const wetGain = audioContext.createGain();
  const delayA = audioContext.createDelay(0.12);
  const delayB = audioContext.createDelay(0.12);
  const gainA = audioContext.createGain();
  const gainB = audioContext.createGain();

  let currentSemitones = null;
  let modulationSources = [];

  input.connect(dryGain);
  dryGain.connect(output);
  input.connect(delayA);
  input.connect(delayB);
  delayA.connect(gainA);
  delayB.connect(gainB);
  gainA.connect(wetGain);
  gainB.connect(wetGain);
  wetGain.connect(output);

  dryGain.gain.value = 1;
  wetGain.gain.value = 0;
  gainA.gain.value = 0;
  gainB.gain.value = 0;

  const stopModulation = () => {
    modulationSources.forEach((source) => {
      try {
        source.stop();
      } catch (error) {
        // The source may already be stopped during rapid slider changes.
      }
      source.disconnect();
    });
    modulationSources = [];
  };

  const setPitch = (semitones) => {
    if (currentSemitones !== null && Math.abs(currentSemitones - semitones) < 0.001) {
      return;
    }

    currentSemitones = semitones;
    const now = audioContext.currentTime;
    const smooth = 0.02;

    stopModulation();

    if (Math.abs(semitones) < 0.01) {
      dryGain.gain.setTargetAtTime(1, now, smooth);
      wetGain.gain.setTargetAtTime(0, now, smooth);
      gainA.gain.setTargetAtTime(0, now, smooth);
      gainB.gain.setTargetAtTime(0, now, smooth);
      return;
    }

    const ratio = getPitchRate(semitones);
    const sweep = 0.055;
    const minDelay = 0.008;
    const period = clamp(sweep / Math.abs(ratio - 1), 0.08, 0.45);
    const rising = semitones < 0;

    const delayBufferA = buildModulationBuffer(audioContext, period, (phase) => {
      const ramp = rising ? phase : 1 - phase;
      return minDelay + ramp * sweep;
    });
    const delayBufferB = buildModulationBuffer(audioContext, period, (phase) => {
      const shiftedPhase = (phase + 0.5) % 1;
      const ramp = rising ? shiftedPhase : 1 - shiftedPhase;
      return minDelay + ramp * sweep;
    });
    const fadeBufferA = buildModulationBuffer(audioContext, period, (phase) => {
      return 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
    });
    const fadeBufferB = buildModulationBuffer(audioContext, period, (phase) => {
      return 0.5 + 0.5 * Math.cos(2 * Math.PI * phase);
    });

    const delaySourceA = createLoopingSource(audioContext, delayBufferA);
    const delaySourceB = createLoopingSource(audioContext, delayBufferB);
    const fadeSourceA = createLoopingSource(audioContext, fadeBufferA);
    const fadeSourceB = createLoopingSource(audioContext, fadeBufferB);

    delayA.delayTime.value = 0;
    delayB.delayTime.value = 0;
    gainA.gain.value = 0;
    gainB.gain.value = 0;

    delaySourceA.connect(delayA.delayTime);
    delaySourceB.connect(delayB.delayTime);
    fadeSourceA.connect(gainA.gain);
    fadeSourceB.connect(gainB.gain);

    modulationSources = [delaySourceA, delaySourceB, fadeSourceA, fadeSourceB];
    modulationSources.forEach((source) => source.start(now));

    dryGain.gain.setTargetAtTime(0, now, smooth);
    wetGain.gain.setTargetAtTime(1, now, smooth);
  };

  return {
    input,
    output,
    setPitch,
    stop: stopModulation
  };
};

export function useAudioEngine() {
  const audioRef = useRef(null);
  const audioUrlRef = useRef('');
  const contextRef = useRef(null);
  const sourceRef = useRef(null);
  const nodesRef = useRef({});
  const animationRef = useRef(null);
  const shouldPlayAfterSeekRef = useRef(false);

  const [effects, setEffects] = useState(defaultEffects);
  const [fileName, setFileName] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [levels, setLevels] = useState(new Array(32).fill(0));

  const ensureAudioContext = useCallback(() => {
    if (!audioRef.current) {
      return null;
    }

    if (contextRef.current) {
      return contextRef.current;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaElementSource(audioRef.current);

    const dryGain = audioContext.createGain();
    const wetGain = audioContext.createGain();
    const volume = audioContext.createGain();
    const pitchShifter = createPitchShifter(audioContext);
    const bass = audioContext.createBiquadFilter();
    const mid = audioContext.createBiquadFilter();
    const treble = audioContext.createBiquadFilter();
    const lowPass = audioContext.createBiquadFilter();
    const highPass = audioContext.createBiquadFilter();
    const reverb = audioContext.createConvolver();
    const pan = audioContext.createStereoPanner();
    const analyser = audioContext.createAnalyser();

    bass.type = 'lowshelf';
    bass.frequency.value = 180;
    mid.type = 'peaking';
    mid.frequency.value = 1000;
    mid.Q.value = 0.9;
    treble.type = 'highshelf';
    treble.frequency.value = 3200;
    lowPass.type = 'lowpass';
    lowPass.Q.value = 0.7;
    highPass.type = 'highpass';
    highPass.Q.value = 0.7;
    reverb.buffer = buildImpulseResponse(audioContext);
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.82;

    source.connect(volume);
    volume.connect(pitchShifter.input);
    pitchShifter.output.connect(bass);
    bass.connect(mid);
    mid.connect(treble);
    treble.connect(lowPass);
    lowPass.connect(highPass);
    highPass.connect(dryGain);
    highPass.connect(reverb);
    reverb.connect(wetGain);
    dryGain.connect(pan);
    wetGain.connect(pan);
    pan.connect(analyser);
    analyser.connect(audioContext.destination);

    contextRef.current = audioContext;
    sourceRef.current = source;
    nodesRef.current = {
      analyser,
      bass,
      dryGain,
      highPass,
      lowPass,
      mid,
      pan,
      pitchShifter,
      treble,
      volume,
      wetGain
    };

    return audioContext;
  }, []);

  const applyEffects = useCallback((nextEffects) => {
    const audio = audioRef.current;
    const audioContext = contextRef.current;
    const nodes = nodesRef.current;

    if (audio) {
      audio.playbackRate = nextEffects.speed;
      audio.preservesPitch = true;
      audio.mozPreservesPitch = true;
      audio.webkitPreservesPitch = true;
    }

    if (!audioContext || !nodes.volume) {
      return;
    }

    const now = audioContext.currentTime;
    const smooth = 0.03;

    nodes.volume.gain.setTargetAtTime(nextEffects.volume, now, smooth);
    nodes.pitchShifter.setPitch(nextEffects.pitch);
    nodes.bass.gain.setTargetAtTime(nextEffects.bass, now, smooth);
    nodes.mid.gain.setTargetAtTime(nextEffects.mid, now, smooth);
    nodes.treble.gain.setTargetAtTime(nextEffects.treble, now, smooth);
    nodes.dryGain.gain.setTargetAtTime(1 - nextEffects.reverb * 0.55, now, smooth);
    nodes.wetGain.gain.setTargetAtTime(nextEffects.reverb, now, smooth);
    nodes.pan.pan.setTargetAtTime(nextEffects.pan, now, smooth);
    nodes.lowPass.frequency.setTargetAtTime(nextEffects.lowPass, now, smooth);
    nodes.highPass.frequency.setTargetAtTime(nextEffects.highPass, now, smooth);
  }, []);

  useEffect(() => {
    applyEffects(effects);
  }, [applyEffects, effects]);

  const drawLevels = useCallback(() => {
    const analyser = nodesRef.current.analyser;
    if (analyser) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      setLevels(Array.from(data.slice(0, 32)).map((value) => value / 255));
    }

    animationRef.current = window.requestAnimationFrame(drawLevels);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = window.requestAnimationFrame(drawLevels);
    } else if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawLevels, isPlaying]);

  const loadFile = useCallback((file) => {
    if (!file) {
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setAudioUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return nextUrl;
    });
    setFileName(file.name);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const loadUrl = useCallback((url, name) => {
    setAudioUrl((previousUrl) => {
      if (previousUrl && previousUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previousUrl);
      }
      return url;
    });
    setFileName(name);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      return;
    }

    const audioContext = ensureAudioContext();
    applyEffects(effects);

    if (audioContext?.state === 'suspended') {
      await audioContext.resume();
    }

    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [applyEffects, audioUrl, effects, ensureAudioContext]);

  const restart = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      return;
    }

    audio.currentTime = 0;
    setCurrentTime(0);

    if (!audio.paused) {
      await audio.play();
    }
  }, [audioUrl]);

  const seek = useCallback((value) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.currentTime = value;
    setCurrentTime(value);
  }, []);

  const beginScrub = useCallback(() => {
    const audio = audioRef.current;
    shouldPlayAfterSeekRef.current = Boolean(audio && !audio.paused);
  }, []);

  const endScrub = useCallback(async () => {
    const audio = audioRef.current;
    if (audio && shouldPlayAfterSeekRef.current) {
      await audio.play();
      setIsPlaying(true);
    }
  }, []);

  const updateEffect = useCallback((key, value) => {
    setEffects((previous) => {
      const nextEffects = { ...previous, [key]: value };
      applyEffects(nextEffects);
      return nextEffects;
    });
  }, [applyEffects]);

  const resetEffects = useCallback(() => {
    setEffects(defaultEffects);
    applyEffects(defaultEffects);
  }, [applyEffects]);

  const applyPreset = useCallback((preset) => {
    setEffects((previous) => {
      const nextEffects = { ...previous, ...preset };
      applyEffects(nextEffects);
      return nextEffects;
    });
  }, [applyEffects]);

  useEffect(() => {
    audioUrlRef.current = audioUrl;
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return undefined;
    }

    const handleLoadedMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [audioUrl]);

  useEffect(() => () => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }
    if (contextRef.current) {
      nodesRef.current.pitchShifter?.stop();
      contextRef.current.close();
    }
  }, []);

  return {
    audioRef,
    audioUrl,
    currentTime,
    duration,
    effects,
    fileName,
    isPlaying,
    levels,
    applyPreset,
    beginScrub,
    endScrub,
    loadFile,
    loadUrl,
    resetEffects,
    restart,
    seek,
    togglePlayback,
    updateEffect
  };
}
