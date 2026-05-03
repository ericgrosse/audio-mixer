import EffectSlider from './EffectSlider';

const effectGroups = [
  {
    title: 'Core',
    sliders: [
      {
        key: 'volume',
        label: 'Volume',
        min: 0,
        max: 1.5,
        step: 0.01,
        format: (value) => `${Math.round(value * 100)}%`
      },
      {
        key: 'speed',
        label: 'Playback speed',
        min: 0.25,
        max: 4,
        step: 0.01,
        format: (value) => `${value.toFixed(2)}x`
      },
      {
        key: 'pitch',
        label: 'Pitch shift',
        min: -12,
        max: 12,
        step: 1,
        format: (value) => `${value > 0 ? '+' : ''}${value} semitones`
      }
    ]
  },
  {
    title: 'Tone',
    sliders: [
      {
        key: 'bass',
        label: 'Bass',
        min: -18,
        max: 18,
        step: 0.5,
        format: (value) => `${value > 0 ? '+' : ''}${value.toFixed(1)} dB`
      },
      {
        key: 'mid',
        label: 'Mid EQ',
        min: -18,
        max: 18,
        step: 0.5,
        format: (value) => `${value > 0 ? '+' : ''}${value.toFixed(1)} dB`
      },
      {
        key: 'treble',
        label: 'Treble',
        min: -18,
        max: 18,
        step: 0.5,
        format: (value) => `${value > 0 ? '+' : ''}${value.toFixed(1)} dB`
      }
    ]
  },
  {
    title: 'Space',
    sliders: [
      {
        key: 'pan',
        label: 'Pan',
        min: -1,
        max: 1,
        step: 0.01,
        format: (value) => {
          if (Math.abs(value) < 0.01) {
            return 'Center';
          }
          return `${Math.round(Math.abs(value) * 100)}% ${value < 0 ? 'L' : 'R'}`;
        }
      },
      {
        key: 'reverb',
        label: 'Reverb',
        min: 0,
        max: 1,
        step: 0.01,
        format: (value) => `${Math.round(value * 100)}%`
      }
    ]
  },
  {
    title: 'Filters',
    sliders: [
      {
        key: 'lowPass',
        label: 'Low-pass',
        min: 500,
        max: 20000,
        step: 50,
        format: (value) => `${Math.round(value)} Hz`
      },
      {
        key: 'highPass',
        label: 'High-pass',
        min: 20,
        max: 5000,
        step: 10,
        format: (value) => `${Math.round(value)} Hz`
      }
    ]
  }
];

function EffectsPanel({ effects, onChange }) {
  return (
    <section className="effects-panel" aria-labelledby="effects-heading">
      <div className="section-heading">
        <h2 id="effects-heading">Effects</h2>
      </div>

      <div className="effect-grid">
        {effectGroups.map((group) => (
          <div className="effect-group" key={group.title}>
            <h3>{group.title}</h3>
            {group.sliders.map((slider) => (
              <EffectSlider
                key={slider.key}
                value={effects[slider.key]}
                onChange={(value) => onChange(slider.key, value)}
                {...slider}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export default EffectsPanel;
