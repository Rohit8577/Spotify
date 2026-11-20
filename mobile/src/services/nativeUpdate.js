import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

const APK_PREFIX = 'sangeetx-v';

/**
 * Returns the target local file URI for a given version APK.
 */
export function getLocalApkUri(version) {
  const cleanVersion = String(version || 'latest').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${FileSystem.cacheDirectory}${APK_PREFIX}${cleanVersion}.apk`;
}

/**
 * Checks whether the APK for a given version has already been completely downloaded.
 */
export async function isApkDownloaded(version) {
  try {
    const fileUri = getLocalApkUri(version);
    const info = await FileSystem.getInfoAsync(fileUri);
    // An APK for SangeetX is ~90-100MB; a file > 5MB indicates a completed download
    if (info.exists && !info.isDirectory && info.size && info.size > 5 * 1024 * 1024) {
      return { exists: true, uri: fileUri, size: info.size };
    }
  } catch (error) {
    console.warn('Could not verify existing APK file:', error);
  }
  return { exists: false, uri: null, size: 0 };
}

/**
 * Removes obsolete downloaded APKs from the cache directory to save phone storage.
 */
export async function cleanOldApkCache(preserveVersion) {
  try {
    if (!FileSystem.cacheDirectory) return;
    const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
    const keepFilename = `${APK_PREFIX}${preserveVersion}.apk`;
    for (const file of files) {
      if (file.startsWith(APK_PREFIX) && file.endsWith('.apk') && file !== keepFilename) {
        await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${file}`, { idempotent: true });
      }
    }
  } catch (error) {
    console.warn('Could not clean old APK cache:', error);
  }
}

/**
 * Downloads the APK in the background with progress reporting.
 */
export async function downloadApk({ apkUrl, version, onProgress }) {
  if (!apkUrl) throw new Error('APK URL is required for download');
  const targetUri = getLocalApkUri(version);

  // Clean old cached APKs before beginning download
  await cleanOldApkCache(version);

  // Check if target file already exists and is intact
  const existing = await isApkDownloaded(version);
  if (existing.exists) {
    if (onProgress) onProgress(1);
    return { uri: existing.uri, size: existing.size, fromCache: true };
  }

  // Remove any incomplete partial file
  await FileSystem.deleteAsync(targetUri, { idempotent: true });

  const downloadResumable = FileSystem.createDownloadResumable(
    apkUrl,
    targetUri,
    {},
    (downloadProgress) => {
      if (downloadProgress.totalBytesExpectedToWrite > 0) {
        const ratio = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        if (onProgress) onProgress(Math.min(1, Math.max(0, ratio)));
      }
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result || !result.uri) {
    throw new Error('Download failed or returned empty result');
  }

  return { uri: result.uri, fromCache: false };
}

/**
 * Triggers native package installer on Android to install the downloaded APK.
 * Falls back gracefully to system browser if direct intent launch is not possible.
 */
export async function installApk(fileUri, fallbackUrl) {
  if (Platform.OS !== 'android') {
    if (fallbackUrl) {
      await Linking.openURL(fallbackUrl);
      return true;
    }
    return false;
  }

  try {
    // Convert local file:// URI into a content:// URI backed by FileSystemFileProvider
    const contentUri = await FileSystem.getContentUriAsync(fileUri);

    // Intent.FLAG_GRANT_READ_URI_PERMISSION = 1
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: 1,
      type: 'application/vnd.android.package-archive',
    });
    return true;
  } catch (intentError) {
    console.warn('Direct IntentLauncher installation failed, attempting Linking fallback:', intentError);
    try {
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      await Linking.openURL(contentUri);
      return true;
    } catch (linkError) {
      console.warn('Linking content URI failed, attempting browser download fallback:', linkError);
      if (fallbackUrl) {
        await Linking.openURL(fallbackUrl);
        return true;
      }
      throw linkError;
    }
  }
}
