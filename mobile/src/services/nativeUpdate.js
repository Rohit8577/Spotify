import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { createApkDownloader } from './apkDownloader';

export const { getLocalApkUri, isApkDownloaded, cleanOldApkCache, downloadApk } = createApkDownloader(FileSystem);

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
