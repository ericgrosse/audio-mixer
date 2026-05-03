function EffectSlider({ format, label, max, min, onChange, step, value }) {
  return (
    <label className="effect-slider">
      <span className="slider-topline">
        <span>{label}</span>
        <strong>{format(value)}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export default EffectSlider;
