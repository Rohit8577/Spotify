const APK_PREFIX = 'sangeetx-v';

/** Native adapter is injected so incomplete files and interrupted downloads can be tested. */
export function createApkDownloader(fileSystem) {
  const active = new Map();

  const getLocalApkUri = (version, versionCode = 0) => {
    if (!fileSystem.cacheDirectory) throw new Error('App download storage is unavailable.');
    const cleanVersion = String(version || 'latest').replace(/[^a-zA-Z0-9._-]/g, '_');
    const code = Number.isSafeInteger(Number(versionCode)) ? Number(versionCode) : 0;
    return `${fileSystem.cacheDirectory}${APK_PREFIX}${cleanVersion}-b${code}.apk`;
  };

  const isApkDownloaded = async (version, versionCode = 0, apkUrl = '') => {
    try {
      const uri = getLocalApkUri(version, versionCode);
      const marker = JSON.parse(await fileSystem.readAsStringAsync(`${uri}.ready.json`));
      if (!marker.complete || marker.version !== version || marker.versionCode !== Number(versionCode) ||
          (apkUrl && marker.apkUrl !== apkUrl)) return { exists: false, uri: null, size: 0 };
      const info = await fileSystem.getInfoAsync(uri);
      if (info.exists && !info.isDirectory && info.size > 0 && info.size === marker.size) {
        return { exists: true, uri, size: info.size };
      }
    } catch { /* Partial and obsolete downloads have no valid completion marker. */ }
    return { exists: false, uri: null, size: 0 };
  };

  const cleanOldApkCache = async (version, versionCode = 0) => {
    try {
      const keepUri = getLocalApkUri(version, versionCode);
      for (const name of await fileSystem.readDirectoryAsync(fileSystem.cacheDirectory)) {
        if (!/^sangeetx-v[\w.-]+\.apk(?:\.part|\.ready\.json)?$/.test(name)) continue;
        const uri = `${fileSystem.cacheDirectory}${name}`;
        const protectedUris = [keepUri, ...active.keys()];
        if (protectedUris.some((keep) => uri === keep || uri.startsWith(`${keep}.`))) continue;
        await fileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch { /* Cache cleanup must not prevent an update. */ }
  };

  const downloadApk = ({ apkUrl, version, versionCode = 0, onProgress = undefined }) => {
    if (!apkUrl) return Promise.reject(new Error('APK URL is required.'));
    const uri = getLocalApkUri(version, versionCode);
    const existingTask = active.get(uri);
    if (existingTask) {
      if (existingTask.apkUrl !== apkUrl) {
        return existingTask.promise.then(() => downloadApk({ apkUrl, version, versionCode, onProgress }));
      }
      if (onProgress) existingTask.listeners.add(onProgress);
      return existingTask.promise;
    }

    const task = { apkUrl, listeners: new Set(onProgress ? [onProgress] : []), promise: null };
    active.set(uri, task);
    const progress = (value) => {
      for (const listener of task.listeners) listener(Math.max(0, Math.min(1, value)));
    };

    task.promise = (async () => {
      const existing = await isApkDownloaded(version, versionCode, apkUrl);
      if (existing.exists) {
        progress(1);
        return { uri: existing.uri, size: existing.size, fromCache: true };
      }
      const partialUri = `${uri}.part`;
      try {
        await fileSystem.deleteAsync(`${uri}.ready.json`, { idempotent: true });
        await fileSystem.deleteAsync(partialUri, { idempotent: true });
        const transfer = fileSystem.createDownloadResumable(apkUrl, partialUri, {}, (event) => {
          if (event.totalBytesExpectedToWrite > 0) progress(event.totalBytesWritten / event.totalBytesExpectedToWrite);
        });
        const result = await transfer.downloadAsync();
        if (!result?.uri || result.status !== 200) throw new Error('The APK download did not complete.');
        const info = await fileSystem.getInfoAsync(partialUri);
        if (!info.exists || info.isDirectory || !info.size) throw new Error('The APK download is empty.');
        const headers = Object.fromEntries(Object.entries(result.headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
        const expectedBytes = Number(headers['content-length']);
        if (expectedBytes > 0 && info.size !== expectedBytes) throw new Error('The APK download is incomplete.');
        const signature = await fileSystem.readAsStringAsync(partialUri, {
          encoding: fileSystem.EncodingType.Base64, position: 0, length: 4,
        });
        if (signature !== 'UEsDBA==') throw new Error('The server did not return an APK file.');
        await fileSystem.deleteAsync(uri, { idempotent: true });
        await fileSystem.moveAsync({ from: partialUri, to: uri });
        await fileSystem.writeAsStringAsync(`${uri}.ready.json`, JSON.stringify({
          complete: true, version, versionCode: Number(versionCode), apkUrl, size: info.size,
        }));
        await cleanOldApkCache(version, versionCode);
        progress(1);
        return { uri, size: info.size, fromCache: false };
      } catch (error) {
        await fileSystem.deleteAsync(partialUri, { idempotent: true }).catch(() => {});
        await fileSystem.deleteAsync(`${uri}.ready.json`, { idempotent: true }).catch(() => {});
        throw error;
      }
    })().finally(() => { active.delete(uri); });
    return task.promise;
  };

  return { getLocalApkUri, isApkDownloaded, cleanOldApkCache, downloadApk };
}
