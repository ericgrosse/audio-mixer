import { RotateCcw, Sparkles } from 'lucide-react';

const presets = [
  {
    name: 'Bass Boost',
    values: {
      bass: 9,
      mid: 1.5,
      treble: 2,
      lowPass: 18000,
      highPass: 20,
      reverb: 0.05,
      pan: 0
    }
  },
  {
    name: 'Radio',
    values: {
      bass: -9,
      mid: 7,
      treble: -4,
      lowPass: 4200,
      highPass: 280,
      reverb: 0.02,
      pan: 0
    }
  },
  {
    name: 'Echo Room',
    values: {
      bass: 2,
      mid: -1,
      treble: 3,
      lowPass: 14500,
      highPass: 80,
      reverb: 0.65,
      pan: 0
    }
  }
];

function PresetControls({ onPreset, onReset }) {
  return (
    <section className="preset-row" aria-label="Effect presets">
      <div className="preset-label">
        <Sparkles size={17} aria-hidden="true" />
        Presets
      </div>
      <div className="preset-buttons">
        {presets.map((preset) => (
          <button type="button" key={preset.name} onClick={() => onPreset(preset.values)}>
            {preset.name}
          </button>
        ))}
        <button className="reset-button" type="button" onClick={onReset}>
          <RotateCcw size={16} aria-hidden="true" />
          Reset
        </button>
      </div>
    </section>
  );
}

export default PresetControls;
