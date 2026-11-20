// Apply before EAS computes the native fingerprint, locally and on CI/build servers.
require('../plugins/withAudioWakeLock.cjs').applyWakeMode().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
