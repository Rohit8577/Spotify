const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

const setting = '.setWakeMode(androidx.media3.common.C.WAKE_MODE_NETWORK)';
function patchWakeMode(source) {
  if (source.includes(setting)) return source;
  if (source.includes('.setWakeMode(')) throw new Error('expo-audio now configures wakeMode. Review the local plugin.');
  const anchor = '.setHandleAudioBecomingNoisy(true)';
  if (source.split(anchor).length !== 2) throw new Error('expo-audio builder changed. Review the background audio wake-lock plugin before building.');
  return source.replace(anchor, `${anchor}\n    ${setting}`);
}

// SDK 58 exposes background services but no ExoPlayer wakeMode setting. Let
// ExoPlayer acquire/release CPU + Wi-Fi locks only while playback needs them.
async function applyWakeMode() {
  const root = path.dirname(require.resolve('expo-audio/package.json'));
  for (const file of ['AudioPlayer.kt', 'AudioPlaylist.kt']) {
    const location = path.join(root, 'android/src/main/java/expo/modules/audio', file);
    const original = await fs.readFile(location, 'utf8');
    const patched = patchWakeMode(original);
    if (original !== patched) await fs.writeFile(location, patched);
  }
}
module.exports = function withAudioWakeLock(config) {
  return withDangerousMod(config, ['android', async (mod) => { await applyWakeMode(); return mod; }]);
};
module.exports.patchWakeMode = patchWakeMode;
module.exports.applyWakeMode = applyWakeMode;
