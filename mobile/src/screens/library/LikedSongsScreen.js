import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { musicApi } from '../../api/musicApi';
import { usePlayer } from '../../context/PlayerContext';
import { SongItem } from '../../components/SongItem';

export const LikedSongsScreen = ({ navigation }) => {
  const { playSong } = usePlayer();
  const [likedSongs, setLikedSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLikedSongs = async () => {
    setLoading(true);
    try {
      const res = await musicApi.getFavorites();
      setLikedSongs(res.arr || []);
    } catch (e) {
      console.warn('Error fetching liked songs:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (likedSongs.length > 0) {
      playSong(likedSongs[0], likedSongs, 0);
    }
  };

  useEffect(() => {
    loadLikedSongs();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Big Gradient Header */}
        <LinearGradient colors={['#431c7a', '#241042', colors.background]} style={styles.header}>
          <View style={styles.heartBox}>
            <Ionicons name="heart" size={54} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Liked Songs</Text>
          <Text style={styles.meta}>{likedSongs.length} songs</Text>

          {likedSongs.length > 0 && (
            <TouchableOpacity style={styles.playBtn} onPress={handlePlayAll}>
              <Ionicons name="play" size={26} color="#000" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          )}
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : likedSongs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-dislike-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Songs you like will appear here</Text>
            <Text style={styles.emptySub}>Save songs by tapping the heart icon.</Text>
          </View>
        ) : (
          <View style={styles.songList}>
            {likedSongs.map((song, idx) => (
              <SongItem
                key={song.songId || song.id || String(idx)}
                song={{
                  id: song.songId || song.id,
                  title: song.songName || song.title,
                  artist: song.artist,
                  image: song.image,
                  url: song.songUrl || song.url,
                  duration: song.len || song.duration,
                }}
                index={idx}
                showIndex
                onPress={() => playSong(song, likedSongs, idx)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  backBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 28,
  },
  heartBox: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#6022b3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#6022b3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songList: {
    paddingHorizontal: 4,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
});
