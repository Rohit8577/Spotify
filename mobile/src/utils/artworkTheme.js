export function themeFromColor(value) {
  const hex = /^#[a-f0-9]{6}$/i.test(value || '') ? value : '#00e5ff';
  const rgb = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const mix = (factor, white = 0) => '#' + rgb.map((v) => Math.round(v * factor + 255 * white).toString(16).padStart(2, '0')).join('');
  return { background: mix(0.28), surface: mix(0.45), accent: mix(0.55, 0.45) };
}
