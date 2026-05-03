const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) {
    return '0:00';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

function PlaybackControls({ currentTime, duration, onBeginScrub, onEndScrub, onSeek }) {
  return (
    <div className="seek-area">
      <span>{formatTime(currentTime)}</span>
      <input
        aria-label="Seek"
        className="seek-slider"
        type="range"
        min="0"
        max={duration || 0}
        step="0.01"
        value={Math.min(currentTime, duration || 0)}
        disabled={!duration}
        onMouseDown={onBeginScrub}
        onTouchStart={onBeginScrub}
        onMouseUp={onEndScrub}
        onTouchEnd={onEndScrub}
        onChange={(event) => onSeek(Number(event.target.value))}
      />
      <span>{formatTime(duration)}</span>
    </div>
  );
}

export default PlaybackControls;
