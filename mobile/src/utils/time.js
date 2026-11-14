export function formatTime(seconds) {
  if (!Number.isFinite(Number(seconds)) || Number(seconds) < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatDuration(duration) {
  // If string with seconds or mm:ss
  if (typeof duration === 'string' && duration.includes(':')) return duration;
  const num = Number(duration);
  return formatTime(num);
}
