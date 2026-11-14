import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Share,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { usePlayer } from '../context/PlayerContext';
import { musicApi } from '../api/musicApi';
import { formatTime } from '../utils/time';

const { width } = Dimensions.get('window');

export const FullPlayerModal = ({ onOpenPlaylistModal, onOpenShareModal }) => {
  const {
    currentSong,
    isPlaying,
    isLoadingSong,
    positionMillis,
    durationMillis,
    isShuffle,
    repeatMode,
    volume,
    isFullPlayerVisible,
    setIsFullPlayerVisible,
    togglePlayPause,
    seekTo,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    setVolume,
    setIsEqualizerVisible,
    setIsLyricsVisible,
  } = usePlayer();

  const [isLiked, setIsLiked] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPos, setSeekPos] = useState(0);

  async function checkLikedStatus() {
    try {
      const favs = await musicApi.getFavorites();
      if (favs?.arr) {
        setIsLiked(favs.arr.some((s) => String(s.songId) === String(currentSong?.id)));
      }
    } catch (e) {}
  }

  const handleToggleLike = async () => {
    if (!currentSong) return;
    try {
      const next = !isLiked;
      setIsLiked(next);
      await musicApi.toggleFavorite({
        songId: currentSong.id,
        url: currentSong.url,
        image: currentSong.image,
        name: currentSong.title,
        artist: currentSong.artist,
        len: currentSong.duration,
      });
    } catch (e) {
      setIsLiked(!isLiked);
    }
  };

  const handleNativeShare = async () => {
    if (!currentSong) return;
    try {
      await Share.share({
        title: currentSong.title,
        message: `Listen to "${currentSong.title}" by ${currentSong.artist} on SangeetX! 🎵\n${currentSong.url || ''}`,
      });
    } catch (e) {}
  };

  useEffect(() => {
    if (currentSong) {
      checkLikedStatus();
    }
  }, [currentSong?.id]);

  if (!currentSong) return null;

  const currentPos = isSeeking ? seekPos : positionMillis;
  const maxDuration = Math.max(durationMillis, 1000);

  return (
    <Modal
      visible={isFullPlayerVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => setIsFullPlayerVisible(false)}
    >
      <LinearGradient
        colors={['#383838', '#1c1c1c', '#121212']}
        style={styles.gradientContainer}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => setIsFullPlayerVisible(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-down" size={28} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.topBarCenter}>
              <Text style={styles.topBarSub}>PLAYING FROM</Text>
              <Text style={styles.topBarTitle} numberOfLines={1}>
                {currentSong.source ? currentSong.source.toUpperCase() : 'SANGEETX'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleNativeShare}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="share-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Album Cover Art */}
            <View style={styles.artworkContainer}>
              <Image source={{ uri: currentSong.image }} style={styles.artwork} />
            </View>

            {/* Song Meta & Like Button */}
            <View style={styles.metaRow}>
              <View style={styles.titleContainer}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {currentSong.title}
                </Text>
                <Text style={styles.artistName} numberOfLines={1}>
                  {currentSong.artist}
                </Text>
              </View>

              <TouchableOpacity onPress={handleToggleLike} style={styles.likeBtn}>
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={28}
                  color={isLiked ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Scrubber / Slider */}
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={maxDuration}
                value={currentPos}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
                thumbTintColor={colors.text}
                onValueChange={(val) => {
                  setIsSeeking(true);
                  setSeekPos(val);
                }}
                onSlidingComplete={async (val) => {
                  await seekTo(val);
                  setIsSeeking(false);
                }}
              />
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(currentPos / 1000)}</Text>
                <Text style={styles.timeText}>{formatTime(maxDuration / 1000)}</Text>
              </View>
            </View>

            {/* Main Playback Controls */}
            <View style={styles.controlsRow}>
              <TouchableOpacity onPress={toggleShuffle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons
                  name="shuffle"
                  size={24}
                  color={isShuffle ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={playPrevious} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="play-skip-back" size={34} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={togglePlayPause}
                style={styles.playPauseBtn}
                activeOpacity={0.8}
              >
                {isLoadingSong ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={34}
                    color="#000"
                    style={{ marginLeft: isPlaying ? 0 : 3 }}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={playNext} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="play-skip-forward" size={34} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleRepeat} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons
                  name={repeatMode === 'one' ? 'repeat' : 'repeat'}
                  size={24}
                  color={repeatMode !== 'off' ? colors.primary : colors.textSecondary}
                />
                {repeatMode === 'one' && (
                  <Text style={styles.repeatBadge}>1</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Volume Control */}
            <View style={styles.volumeRow}>
              <Ionicons name="volume-low-outline" size={20} color={colors.textSecondary} />
              <Slider
                style={styles.volumeSlider}
                minimumValue={0}
                maximumValue={1}
                value={volume}
                minimumTrackTintColor={colors.text}
                maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
                thumbTintColor={colors.text}
                onValueChange={(v) => setVolume(v)}
              />
              <Ionicons name="volume-high-outline" size={20} color={colors.textSecondary} />
            </View>

            {/* Quick Action Buttons: Lyrics, EQ, Add to Playlist, Social Share */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setIsEqualizerVisible(true)}
              >
                <Ionicons name="options-outline" size={20} color={colors.text} />
                <Text style={styles.actionBtnText}>EQ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setIsLyricsVisible(true)}
              >
                <Ionicons name="reader-outline" size={20} color={colors.text} />
                <Text style={styles.actionBtnText}>Lyrics</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onOpenPlaylistModal && onOpenPlaylistModal(currentSong)}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.text} />
                <Text style={styles.actionBtnText}>Save</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onOpenShareModal && onOpenShareModal(currentSong)}
              >
                <Ionicons name="paper-plane-outline" size={20} color={colors.text} />
                <Text style={styles.actionBtnText}>Friend</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  topBarCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 12,
  },
  topBarSub: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  topBarTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  artworkContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  artwork: {
    width: width - 64,
    height: width - 64,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  songTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  artistName: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  likeBtn: {
    padding: 6,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -8,
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  playPauseBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  volumeSlider: {
    flex: 1,
    marginHorizontal: 10,
    height: 30,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtn: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  actionBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});
