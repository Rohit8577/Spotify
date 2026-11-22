/** Keep downloaded updates ready even before the native hook publishes its state. */
export function createOtaUpdater({ updates, isPlaybackActive = () => false }) {
  let nativePending = false;
  let downloaded = false;
  let checking = null;

  const isPending = () => nativePending || downloaded;

  const checkAndDownload = () => {
    if (isPending()) return Promise.resolve({ ready: true });
    if (checking) return checking;

    checking = (async () => {
      const candidate = await updates.checkForUpdateAsync();
      if (!candidate.isAvailable && !candidate.isRollBackToEmbedded) {
        return { ready: isPending() };
      }

      const result = await updates.fetchUpdateAsync();
      downloaded = Boolean(result.isNew || result.isRollBackToEmbedded);
      return { ready: isPending() };
    })().finally(() => { checking = null; });
    return checking;
  };

  return {
    isPending,
    setNativePending: (pending) => { nativePending = Boolean(pending); },
    checkAndDownload,
    apply: () => {
      if (isPlaybackActive()) {
        const error = new Error('Pause playback before applying the update.');
        error.name = 'PlaybackActiveError';
        return Promise.reject(error);
      }
      if (!isPending()) return Promise.resolve();
      return updates.reloadAsync();
    },
  };
}
