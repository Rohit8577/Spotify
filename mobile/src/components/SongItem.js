import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/time';
import { normalizeSong } from '../utils/song';

export const SongItem = ({
  song,
  index,
  onPress,
  onOptionsPress = undefined,
  showIndex = false,
  showDuration = true,
}) => {
  const { currentSong, isPlaying } = usePlayer();
  const isCurrent = currentSong?.id === String(song.id || song.songId);

  const normalized = normalizeSong(song);
  const { title, artist, image, duration } = normalized || {};

  return (
    <TouchableOpacity
      style={[styles.container, isCurrent && styles.activeContainer]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {showIndex && (
        <Text style={[styles.index, isCurrent && styles.activeText]}>
          {index !== undefined ? index + 1 : ''}
        </Text>
      )}

      <Image source={{ uri: image }} style={styles.thumbnail} />

      <View style={styles.infoContainer}>
        <Text
          style={[styles.title, isCurrent && styles.activeText]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        <Text style={styles.artist} numberOfLines={1} ellipsizeMode="tail">
          {artist}
        </Text>
      </View>

      {isCurrent && (
        <Ionicons
          name={isPlaying ? 'volume-high' : 'volume-mute'}
          size={18}
          color={colors.primary}
          style={styles.playingIcon}
        />
      )}

      {showDuration && duration ? (
        <Text style={styles.duration}>{formatTime(duration)}</Text>
      ) : null}

      {onOptionsPress && (
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => onOptionsPress(song)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeContainer: {
    backgroundColor: 'rgba(29, 185, 84, 0.08)',
  },
  index: {
    width: 24,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginRight: 8,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  activeText: {
    color: colors.primary,
  },
  artist: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  playingIcon: {
    marginHorizontal: 8,
  },
  duration: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 8,
  },
  moreButton: {
    padding: 4,
  },
});
