import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from './Icon';
import { colors } from '../theme/colors';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/time';

export const MiniPlayer = () => {
  const {
    currentSong,
    artworkTheme,
    isPlaying,
    isLoadingSong,
    positionMillis,
    durationMillis,
    togglePlayPause,
    playNext,
    setIsFullPlayerVisible,
    isCurrentSongLiked: isLiked,
    isUpdatingFavorite,
    toggleCurrentSongFavorite: handleToggleLike,
  } = usePlayer();

  if (!currentSong) return null;

  const progressPercent = durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0;

  return (
    <View style={[styles.wrapper, { backgroundColor: artworkTheme.background }]}>
      {/* Mini Progress Bar Line */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { backgroundColor: artworkTheme.accent, width: `${Math.min(100, Math.max(0, progressPercent))}%` }]} />
      </View>

      <TouchableOpacity
        style={styles.container}
        accessibilityLabel="Open player"
        activeOpacity={0.9}
        onPress={() => setIsFullPlayerVisible(true)}
      >
        <Image source={{ uri: currentSong.image }} style={styles.thumbnail} />

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {currentSong.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {currentSong.artist} · {formatTime(positionMillis / 1000)} / {formatTime(durationMillis / 1000)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleToggleLike}
          accessibilityLabel={isLiked ? 'Unlike song' : 'Like song'}
          disabled={isUpdatingFavorite}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={isLiked ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={togglePlayPause}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          disabled={isLoadingSong}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isLoadingSong ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color={colors.text}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={playNext}
          accessibilityLabel="Next song"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="play-skip-forward" size={22} color={colors.text} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#282828',
    borderRadius: 8,
    marginHorizontal: 8,
    marginBottom: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  progressBarBackground: {
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  thumbnail: {
    width: 42,
    height: 42,
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
  info: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  iconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
