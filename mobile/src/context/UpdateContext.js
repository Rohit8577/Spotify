import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AppState, Platform, Linking } from 'react-native';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { Alert } from '../utils/alert';
import { usePlayer } from './PlayerContext';
import { getApiBaseUrl } from '../api/config';
import { fetchRemoteVersion, isNewerVersion } from '../utils/versionCheck';
import { downloadApk, installApk, isApkDownloaded } from '../services/nativeUpdate';
import { createOtaUpdater } from '../services/otaUpdater';

let Application = null;
try {
  Application = require('expo-application');
} catch {}

const UpdateContext = createContext(null);

export function UpdateProvider({ children }) {
  const { isPlaybackActive } = usePlayer();
  const { isUpdatePending: isOtaPending, isDownloading: isOtaDownloading, downloadProgress: otaProgress } = Updates.useUpdates();

  // App version information
  const currentVersion = Application?.nativeApplicationVersion || Constants.expoConfig?.version || '1.1.1';
  const currentVersionCode = Number(Application?.nativeBuildVersion || Constants.expoConfig?.android?.versionCode || 1);

  // Update states
  const [status, setStatus] = useState('Updates download automatically');
  const [updateType, setUpdateType] = useState('none'); // 'none' | 'ota' | 'native'
  const [availableVersion, setAvailableVersion] = useState(null);
  const [availableVersionCode, setAvailableVersionCode] = useState(null);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [apkUrl, setApkUrl] = useState('');
  const [apkReady, setApkReady] = useState(false);
  const [otaReady, setOtaReady] = useState(false);
  const [apkUri, setApkUri] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const busy = useRef(false);
  const lastCheck = useRef(0);
  const playback = useRef(isPlaybackActive);
  useEffect(() => { playback.current = isPlaybackActive; });
  const otaUpdater = useMemo(() => createOtaUpdater({ updates: Updates }), []);
  useEffect(() => { otaUpdater.setNativePending(isOtaPending); }, [otaUpdater, isOtaPending]);

  const otaSupported = Platform.OS !== 'web' && Updates.isEnabled && !__DEV__;

  const applyOtaUpdate = useCallback(async () => {
    if (!otaSupported) return;
    if (playback.current?.()) {
      Alert.alert('Music is playing', 'Pause playback before applying the update.');
      return;
    }
    try {
      await otaUpdater.apply();
    } catch (error) {
      if (error.name === 'PlaybackActiveError') {
        Alert.alert('Music is playing', 'Pause playback before applying the update.');
      } else {
        setStatus('Could not restart. Close and reopen the app to update.');
      }
    }
  }, [otaSupported, otaUpdater]);

  // Execute APK installation with playback safety checks
  const triggerInstall = useCallback(async (fileUri, webFallbackUrl) => {
    if (playback.current && playback.current()) {
      Alert.alert('Music is playing', 'Pause playback before installing the update.');
      return;
    }
    setStatus('Launching installer…');
    try {
      await installApk(fileUri, webFallbackUrl);
    } catch (error) {
      console.warn('Install error:', error);
      setStatus('Could not open installer. Direct download link available.');
      Alert.alert(
        'Installation Help',
        'Could not automatically launch the APK installer. Would you like to download directly via browser?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Download via Browser', onPress: () => webFallbackUrl && Linking.openURL(webFallbackUrl) },
        ]
      );
    }
  }, []);

  // Apply update (installs APK or restarts OTA bundle)
  const applyUpdate = useCallback(async () => {
    if (playback.current && playback.current()) {
      Alert.alert('Music is playing', 'Pause playback before applying the update.');
      return;
    }

    if (updateType === 'native' || apkReady) {
      if (apkUri) {
        await triggerInstall(apkUri, apkUrl);
      } else if (apkUrl) {
        await Linking.openURL(apkUrl);
      }
      return;
    }

    await applyOtaUpdate();
  }, [updateType, apkReady, apkUri, apkUrl, triggerInstall, applyOtaUpdate]);

  // Download native APK in background
  const downloadNativeUpdate = useCallback(async (targetApkUrl, targetVersion, manual = false, targetVersionCode = availableVersionCode) => {
    const url = targetApkUrl || apkUrl;
    const version = targetVersion || availableVersion;
    if (!url) return;

    // Check if already completely downloaded
    const existing = await isApkDownloaded(version, targetVersionCode, url);
    if (existing.exists) {
      setApkReady(true);
      setApkUri(existing.uri);
      setDownloadProgress(1);
      setStatus(`Update v${version} downloaded. Ready to install.`);
      if (manual) {
        Alert.alert(
          'Update Ready to Install',
          `SangeetX v${version} is downloaded and ready to install.`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Install Now', onPress: () => void triggerInstall(existing.uri, url) },
          ]
        );
      }
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setStatus(`Downloading update v${version}…`);

    try {
      const result = await downloadApk({
        apkUrl: url,
        version,
        versionCode: targetVersionCode,
        onProgress: (progress) => {
          setDownloadProgress(progress);
          setStatus(`Downloading update v${version} (${Math.round(progress * 100)}%)…`);
        },
      });

      setApkReady(true);
      setApkUri(result.uri);
      setIsDownloading(false);
      setDownloadProgress(1);
      setStatus(`Update v${version} ready to install.`);

      if (manual || !(playback.current && playback.current())) {
        Alert.alert(
          'Update Ready',
          `SangeetX v${version} has finished downloading.\n\nInstall now to upgrade?`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Install Now', onPress: () => void triggerInstall(result.uri, url) },
          ]
        );
      }
    } catch (err) {
      console.warn('Background APK download failed:', err);
      setIsDownloading(false);
      setStatus(`Download failed for v${version}. Tap to retry.`);
      if (manual) {
        Alert.alert('Download Failed', 'Could not download the update file. Please verify your connection.');
      }
    }
  }, [apkUrl, availableVersion, availableVersionCode, triggerInstall]);

  // Main update check: checks Native version change first, then OTA updates
  const checkForUpdates = useCallback(async (manual = false) => {
    if (busy.current || (!manual && Date.now() - lastCheck.current < 5 * 60000)) return;
    busy.current = true;
    lastCheck.current = Date.now();
    setIsChecking(true);
    setStatus('Checking for updates…');

    try {
      const baseUrl = getApiBaseUrl();
      let nativeUpdate = null;

      // 1. Check Native Version from backend
      try {
        const remote = await fetchRemoteVersion(baseUrl);
        if (remote && remote.version) {
          const hasNewer = Platform.OS === 'android' && remote.apkAvailable !== false &&
            isNewerVersion(remote.version, currentVersion, remote.versionCode, currentVersionCode);
          if (hasNewer) {
            nativeUpdate = remote;
          }
        }
      } catch (nativeErr) {
        console.log('Native version check note:', nativeErr?.message);
      }

      // If a native binary upgrade is detected
      if (nativeUpdate) {
        setUpdateType('native');
        setAvailableVersion(nativeUpdate.version);
        setAvailableVersionCode(nativeUpdate.versionCode);
        setReleaseNotes(nativeUpdate.releaseNotes || '');
        setApkUrl(nativeUpdate.apkUrl || '');

        // Check if APK file is already downloaded in local storage
        const existing = await isApkDownloaded(nativeUpdate.version, nativeUpdate.versionCode, nativeUpdate.apkUrl);
        if (existing.exists) {
          setApkReady(true);
          setApkUri(existing.uri);
          setDownloadProgress(1);
          setStatus(`Update v${nativeUpdate.version} ready to install.`);
          if (manual) {
            Alert.alert(
              'Update Ready to Install',
              `SangeetX v${nativeUpdate.version} is already downloaded and ready to install.`,
              [
                { text: 'Later', style: 'cancel' },
                { text: 'Install Now', onPress: () => void triggerInstall(existing.uri, nativeUpdate.apkUrl) },
              ]
            );
          }
        } else {
          // Auto-download in background
          setStatus(`New version v${nativeUpdate.version} available. Downloading…`);
          await downloadNativeUpdate(nativeUpdate.apkUrl, nativeUpdate.version, manual, nativeUpdate.versionCode);
        }
        return;
      }

      // 2. If native version is current, check for OTA JS updates
      setUpdateType('none');
      setApkReady(false);
      setApkUri(null);
      setApkUrl('');
      setAvailableVersion(null);
      setAvailableVersionCode(null);
      setReleaseNotes('');

      if (otaSupported) {
        const otaResult = await otaUpdater.checkAndDownload();
        if (otaResult.ready) {
          setUpdateType('ota');
          setOtaReady(true);
          setStatus('Update ready. Restart when you are ready.');
          if (manual) {
            Alert.alert('Update Ready', 'A code update was downloaded. Restart SangeetX to apply.', [
              { text: 'Later', style: 'cancel' },
              { text: 'Restart Now', onPress: () => void applyOtaUpdate() },
            ]);
          }
          return;
        }
      }

      setStatus(`SangeetX is up to date (v${currentVersion})`);
      if (manual) {
        Alert.alert('Up to Date', `You are running the latest version of SangeetX (v${currentVersion}).`);
      }
    } catch (err) {
      console.warn('Update check error:', err);
      setStatus('Could not check for updates. Try again when online.');
      if (manual) {
        Alert.alert('Check Failed', 'Could not check for updates. Please check your network connection.');
      }
    } finally {
      busy.current = false;
      setIsChecking(false);
    }
  }, [currentVersion, currentVersionCode, otaSupported, downloadNativeUpdate, triggerInstall, applyOtaUpdate, otaUpdater]);

  // Periodic and lifecycle background update checks
  const checkUpdatesRef = useRef(checkForUpdates);
  useEffect(() => { checkUpdatesRef.current = checkForUpdates; }, [checkForUpdates]);
  useEffect(() => {
    void checkUpdatesRef.current(false);
    const listener = AppState.addEventListener('change', (value) => {
      if (value === 'active') void checkUpdatesRef.current(false);
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void checkUpdatesRef.current(false);
    }, 5 * 60000);
    return () => {
      listener.remove();
      clearInterval(timer);
    };
  }, []);

  const isUpdatePending = apkReady || isOtaPending || otaReady;

  return (
    <UpdateContext.Provider
      value={{
        status: updateType !== 'native' && (isOtaPending || otaReady) ? 'Update ready. Restart when you are ready.' : status,
        updateType,
        currentVersion,
        currentVersionCode,
        availableVersion,
        availableVersionCode,
        releaseNotes,
        apkUrl,
        apkReady,
        apkUri,
        isChecking,
        isDownloading: isDownloading || isOtaDownloading,
        downloadProgress: isDownloading ? downloadProgress : (otaProgress || 0),
        isUpdatePending,
        checkForUpdates,
        applyUpdate,
        downloadNativeUpdate,
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
}

export const useAppUpdates = () => useContext(UpdateContext);
