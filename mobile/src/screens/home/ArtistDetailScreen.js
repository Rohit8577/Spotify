import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { musicApi } from '../../api/musicApi';
import { usePlayer } from '../../context/PlayerContext';
import { SongItem } from '../../components/SongItem';
import { SectionHeader } from '../../components/SectionHeader';

export const ArtistDetailScreen = ({ route, navigation }) => {
  const { artistId, name } = route.params;
  const { playSong } = usePlayer();

  const [artistData, setArtistData] = useState(null);
  const [topSongs, setTopSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  async function loadArtist() {
    setLoading(true);
    try {
      const res = await musicApi.getArtistDetails(artistId);
      const data = res?.data?.data || res?.data || {};
      setArtistData(data);
      if (data.top_songs) setTopSongs(data.top_songs);
      else if (data.topSongs) setTopSongs(data.topSongs);
      else if (data.songs) setTopSongs(data.songs);

      if (data.top_albums) setAlbums(data.top_albums);
      else if (data.albums) setAlbums(data.albums);
    } catch (e) {
      console.warn('Error loading artist details:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleFollow = async () => {
    try {
      setIsFollowing(!isFollowing);
      await musicApi.addArtist(artistId);
    } catch (e) {
      setIsFollowing(isFollowing);
    }
  };

  const handlePlayAll = () => {
    if (topSongs.length > 0) {
      playSong(topSongs[0], topSongs, 0);
    }
  };

  useEffect(() => {
    loadArtist();
  }, [artistId]);

  const artistImg =
    (Array.isArray(artistData?.image) ? artistData.image[2]?.link : artistData?.image) ||
    'https://cdn-icons-png.flaticon.com/512/847/847969.png';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Top Navigation */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Banner */}
            <View style={styles.bannerContainer}>
              <Image source={{ uri: artistImg }} style={styles.bannerImage} />
              <Text style={styles.artistName}>{artistData?.name || name}</Text>
              {artistData?.follower_count ? (
                <Text style={styles.listeners}>
                  {Number(artistData.follower_count).toLocaleString()} monthly listeners
                </Text>
              ) : null}
            </View>

            {/* Actions Bar */}
            <View style={styles.actionsBar}>
              <TouchableOpacity
                style={[styles.followBtn, isFollowing && styles.followingBtn]}
                onPress={handleToggleFollow}
              >
                <Text style={[styles.followText, isFollowing && styles.followingText]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.playAllBtn} onPress={handlePlayAll}>
                <Ionicons name="play" size={24} color="#000" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>

            {/* Top Songs */}
            <SectionHeader title="Popular Songs" />
            <View style={styles.songList}>
              {topSongs.map((song, idx) => (
                <SongItem
                  key={song.id || String(idx)}
                  song={song}
                  index={idx}
                  showIndex
                  onPress={() => playSong(song, topSongs, idx)}
                />
              ))}
            </View>

            {/* Top Albums */}
            {albums.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <SectionHeader title="Releases" />
                <FlatList
                  horizontal
                  data={albums}
                  keyExtractor={(item, idx) => item.id || String(idx)}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                  renderItem={({ item }) => {
                    const img = Array.isArray(item.image) ? item.image[2]?.link : item.image;
                    return (
                      <TouchableOpacity
                        style={styles.albumCard}
                        onPress={() =>
                          navigation.navigate('AlbumDetail', {
                            albumId: item.id,
                            title: item.name,
                          })
                        }
                      >
                        <Image source={{ uri: img }} style={styles.albumImg} />
                        <Text style={styles.albumTitle} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.albumYear}>{item.year || 'Album'}</Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            )}
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
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  bannerImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.card,
    marginBottom: 16,
  },
  artistName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  listeners: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  followBtn: {
    borderWidth: 1,
    borderColor: colors.textSecondary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followingBtn: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
  },
  followText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  followingText: {
    color: colors.primary,
  },
  playAllBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  songList: {
    paddingHorizontal: 4,
  },
  albumCard: {
    width: 130,
  },
  albumImg: {
    width: 130,
    height: 130,
    borderRadius: 8,
    backgroundColor: colors.card,
    marginBottom: 6,
  },
  albumTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  albumYear: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
