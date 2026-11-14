import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { usePlayer } from '../context/PlayerContext';
import { musicApi } from '../api/musicApi';

export const LyricsModal = () => {
  const { currentSong, isLyricsVisible, setIsLyricsVisible } = usePlayer();
  const [lyrics, setLyrics] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadLyrics() {
    if (!currentSong) return;
    setLoading(true);
    setLyrics('');
    try {
      const res = await musicApi.getLyrics(currentSong.id);
      if (res?.data?.status === 'Success' && res?.data?.data?.lyrics) {
        setLyrics(res.data.data.lyrics);
      } else {
        setLyrics('Lyrics are not available for this song.');
      }
    } catch (e) {
      setLyrics('Could not load lyrics. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isLyricsVisible && currentSong) {
      loadLyrics();
    }
  }, [isLyricsVisible, currentSong?.id]);

  return (
    <Modal
      visible={isLyricsVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => setIsLyricsVisible(false)}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setIsLyricsVisible(false)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-down" size={28} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerSongTitle} numberOfLines={1}>
              {currentSong?.title}
            </Text>
            <Text style={styles.headerArtist} numberOfLines={1}>
              {currentSong?.artist}
            </Text>
          </View>

          <TouchableOpacity onPress={loadLyrics}>
            <Ionicons name="refresh" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Fetching lyrics...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.lyricsText}>{lyrics}</Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 12,
  },
  headerSongTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  headerArtist: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  scrollContent: {
    padding: 28,
    paddingBottom: 60,
  },
  lyricsText: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 34,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
