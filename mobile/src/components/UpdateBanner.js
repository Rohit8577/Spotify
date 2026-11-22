import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppUpdates } from '../context/UpdateContext';
import { usePlayer } from '../context/PlayerContext';

export function UpdateBanner() {
  const {
    isUpdatePending,
    isDownloading,
    downloadProgress,
    availableVersion,
    updateType,
    applyUpdate,
  } = useAppUpdates();
  const { isPlaying, isLoadingSong } = usePlayer();

  if (!isUpdatePending && !isDownloading) return null;

  const playing = isPlaying || isLoadingSong;

  // Active background download state
  if (isDownloading) {
    const percent = Math.round((downloadProgress || 0) * 100);
    return (
      <SafeAreaView edges={['top']} style={styles.downloadSafeArea} accessibilityLiveRegion="polite">
        <View style={styles.downloadBanner}>
          <View style={styles.row}>
            <Text style={styles.text}>
              Downloading SangeetX {availableVersion ? `v${availableVersion}` : 'update'} ({percent}%)…
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.max(5, percent)}%` }]} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Update ready to install or restart
  const actionLabel = updateType === 'native' ? 'Install' : 'Restart';
  let message = 'A new update is ready';
  if (playing) {
    message = updateType === 'native' ? 'Update ready • pause music to install' : 'Update ready • pause music to apply';
  } else if (availableVersion) {
    message = `SangeetX v${availableVersion} is ready to install`;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.bannerSafeArea} accessibilityLiveRegion="polite">
      <View style={styles.banner}>
        <Text style={styles.text} numberOfLines={1}>{message}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={applyUpdate}
          style={styles.buttonContainer}
        >
          <Text style={styles.button}>{actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bannerSafeArea: {
    backgroundColor: '#0c2f38',
  },
  downloadSafeArea: {
    backgroundColor: '#10323d',
  },
  banner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#0c2f38',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  downloadBanner: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#10323d',
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  buttonContainer: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00E5FF',
  },
  button: {
    color: '#70EFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00E5FF',
    borderRadius: 2,
  },
});
