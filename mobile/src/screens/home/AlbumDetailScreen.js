import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { musicApi } from '../../api/musicApi';
import { usePlayer } from '../../context/PlayerContext';
import { SongItem } from '../../components/SongItem';

export const AlbumDetailScreen = ({ route, navigation }) => {
  const { albumId, title } = route.params;
  const { playSong } = usePlayer();

  const [albumData, setAlbumData] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadAlbum() {
    setLoading(true);
    try {
      const res = await musicApi.getAlbumDetails(albumId);
      const data = res?.data?.data || res?.data || {};
      setAlbumData(data);
      const tracklist = data.songs || data.data?.songs || [];
      setSongs(tracklist);
    } catch (e) {
      console.warn('Error loading album:', e);
    } finally {
      setLoading(false);
    }
  }

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playSong(songs[0], songs, 0);
    }
  };

  useEffect(() => {
    loadAlbum();
  }, [albumId]);

  const albumCover =
    (Array.isArray(albumData?.image) ? albumData.image[2]?.link : albumData?.image) ||
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4';

  const artistName =
    albumData?.artist_map?.artists?.[0]?.name ||
    albumData?.primaryArtists ||
    albumData?.artist ||
    'Various Artists';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Album Header */}
            <View style={styles.header}>
              <Image source={{ uri: albumCover }} style={styles.cover} />
              <Text style={styles.title}>{albumData?.name || title}</Text>
              <Text style={styles.artist}>{artistName}</Text>
              <Text style={styles.meta}>
                Album • {albumData?.year || ''} • {songs.length} songs
              </Text>

              <TouchableOpacity style={styles.playBtn} onPress={handlePlayAll}>
                <Ionicons name="play" size={26} color="#000" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>

            {/* Tracklist */}
            <View style={styles.tracklist}>
              {songs.map((song, idx) => (
                <SongItem
                  key={song.id || String(idx)}
                  song={song}
                  index={idx}
                  showIndex
                  onPress={() => playSong(song, songs, idx)}
                />
              ))}
            </View>
          </>
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
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  cover: {
    width: 200,
    height: 200,
    borderRadius: 8,
    backgroundColor: colors.card,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  artist: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  meta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
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
  tracklist: {
    paddingHorizontal: 4,
  },
});
