import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useSocket } from '../context/SocketContext';
import { usePlayer } from '../context/PlayerContext';

export const SharedSongNotification = () => {
  const insets = useSafeAreaInsets();
  const { incomingSharedSong, clearSharedSongNotification } = useSocket();
  const { playSong } = usePlayer();

  if (!incomingSharedSong) return null;

  const { from, song } = incomingSharedSong;

  const handlePlayNow = () => {
    if (song) {
      playSong(song);
    }
    clearSharedSongNotification();
  };

  return (
    <View style={[styles.banner, { top: Math.max(16, insets.top + 8) }]}>
      <Image
        source={{
          uri: song?.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
        }}
        style={styles.artwork}
      />
      <View style={styles.info}>
        <Text style={styles.headerText} numberOfLines={1}>
          {from} shared a song with you!
        </Text>
        <Text style={styles.songTitle} numberOfLines={1}>
          {song?.title || song?.name}
        </Text>
      </View>
      <TouchableOpacity style={styles.playBtn} onPress={handlePlayNow}>
        <Ionicons name="play" size={16} color="#000" />
        <Text style={styles.playBtnText}>Play</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={clearSharedSongNotification}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#282828',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  info: {
    flex: 1,
    marginLeft: 10,
  },
  headerText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  songTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  playBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 8,
  },
  playBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  closeBtn: {
    padding: 4,
  },
});
