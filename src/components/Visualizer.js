function Visualizer({ levels }) {
  return (
    <div className="visualizer" aria-label="Audio visualizer">
      {levels.map((level, index) => (
        <span
          key={index}
          style={{ transform: `scaleY(${Math.max(0.08, level)})` }}
        />
      ))}
    </div>
  );
}

export default Visualizer;
