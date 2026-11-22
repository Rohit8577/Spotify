import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { musicApi } from '../../api/musicApi';
import { usePlayer } from '../../context/PlayerContext';
import { SongItem } from '../../components/SongItem';
import { normalizeYouTubeSong, decodeMusicText } from '../../utils/youtube';

const GENRES = [
  { name: 'Bollywood Hits', color: '#E13300', query: 'Bollywood hits' },
  { name: 'Punjabi Beats', color: '#8400E7', query: 'Punjabi' },
  { name: 'Pop & English', color: '#1E3264', query: 'Pop English' },
  { name: 'Hip-Hop / Rap', color: '#BC5900', query: 'Hip Hop' },
  { name: 'Lo-Fi Chill', color: '#537AA1', query: 'Lofi chill' },
  { name: 'Romantic & Sad', color: '#E8115B', query: 'Romantic' },
  { name: 'Gym & Workout', color: '#777777', query: 'Workout hype' },
  { name: 'Indie India', color: '#148A08', query: 'Indian Indie' },
  { name: 'Party Mashup', color: '#D84000', query: 'Party mashup' },
  { name: 'Bhakti & Spiritual', color: '#E91429', query: 'Bhakti' },
];

export const SearchScreen = ({ navigation, onOpenPlaylistModal, onOpenShareModal }) => {
  const { playSong } = usePlayer();

  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('song'); // 'song' | 'artist' | 'album' | 'playlist' | 'youtube'
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryVersion, setRetryVersion] = useState(0);
  const requestVersion = useRef(0);

  async function executeSearch(searchTerm, type, version) {
    setLoading(true);
    try {
      const res = await musicApi.search({ query: searchTerm, type });
      if (version !== requestVersion.current) return;
      let list = [];
      if (res?.data?.data?.results && Array.isArray(res.data.data.results)) {
        list = res.data.data.results;
      } else if (res?.data?.results && Array.isArray(res.data.results)) {
        list = res.data.results;
      } else if (Array.isArray(res?.data)) {
        list = res.data;
      } else if (res?.data?.items && Array.isArray(res.data.items)) {
        list = res.data.items; // YouTube format
      }
      setResults(type === 'youtube' ? list.map(normalizeYouTubeSong).filter(Boolean) : list);
    } catch (e) {
      console.warn('Search error:', e);
      if (version === requestVersion.current) {
        setResults([]);
        setErrorMessage(type === 'youtube' && e.response?.status === 503 ? 'YouTube search is unavailable right now.' :
          'Search could not load. Check your connection and try again.');
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }

  const handleSelectGenre = (genre) => {
    setQuery(genre.query);
  };

  const handleItemPress = (item) => {
    if (!item) return;
    if (activeType === 'youtube') {
      playSong(item, results);
    } else if (activeType === 'song' || item.type === 'song' || item.download_url || item.downloadUrl) {
      playSong(item, results);
    } else if (activeType === 'artist') {
      navigation.navigate('ArtistDetail', { artistId: item.id, name: item.name });
    } else if (activeType === 'album') {
      navigation.navigate('AlbumDetail', { albumId: item.id, title: item.name });
    } else if (activeType === 'playlist') {
      navigation.navigate('PlaylistDetail', {
        playlistId: item.id,
        title: item.name,
        image: Array.isArray(item.image) ? item.image[2]?.link : item.image,
      });
    }
  };

  const renderResultItem = ({ item, index }) => {
    if (!item) return null;

    if (activeType === 'song') {
      return (
        <SongItem
          song={item}
          index={index}
          onPress={() => handleItemPress(item)}
          onOptionsPress={() => onOpenPlaylistModal && onOpenPlaylistModal(item)}
        />
      );
    }

    const img =
      (Array.isArray(item.image) ? item.image[2]?.link || item.image[1]?.link : item.image) ||
      item.snippet?.thumbnails?.high?.url ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4';
    const title = decodeMusicText(item.name || item.title || item.snippet?.title) || 'Untitled';
    const subtitle =
      item.subtitle ||
      item.artist ||
      item.snippet?.channelTitle ||
      (activeType === 'artist' ? 'Artist' : activeType === 'album' ? 'Album' : 'Playlist');

    return (
      <TouchableOpacity
        style={styles.cardItem}
        activeOpacity={0.7}
        onPress={() => handleItemPress(item)}
      >
        <Image
          source={{ uri: typeof img === 'string' ? img : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4' }}
          style={[styles.cardImg, activeType === 'artist' && styles.artistImgRound]}
        />
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {typeof subtitle === 'string' ? subtitle : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    const version = ++requestVersion.current;
    setResults([]);
    setErrorMessage('');
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const timer = setTimeout(() => {
      executeSearch(query.trim(), activeType, version);
    }, 400);

    return () => {
      clearTimeout(timer);
      requestVersion.current++;
    };
  }, [query, activeType, retryVersion]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Search</Text>

        {/* Search Bar Input */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="What do you want to listen to?"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            maxLength={300}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Type Filter Chips */}
        <View style={styles.filterRow}>
          {[
            { id: 'song', label: 'Songs' },
            { id: 'artist', label: 'Artists' },
            { id: 'album', label: 'Albums' },
            { id: 'playlist', label: 'Playlists' },
            { id: 'youtube', label: 'YouTube' },
          ].map((tab) => {
            const isActive = activeType === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveType(tab.id)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content Body */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : errorMessage ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.emptyText} accessibilityRole="alert">{errorMessage}</Text>
            <TouchableOpacity onPress={() => setRetryVersion((version) => version + 1)} accessibilityLabel="Retry search" style={{ marginTop: 16 }}>
              <Text style={{ color: colors.primary }}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : query.trim().length > 0 ? (
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {Array.isArray(results) && results.length > 0 ? (
              results.map((item, index) => (
                <View key={String(item?.id ?? item?.songId ?? index)}>
                  {renderResultItem({ item, index })}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>{`No results found for "${query}"`}</Text>
            )}
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.browseSection}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.browseTitle}>Browse All Genres</Text>
            <View style={styles.genresWrapper}>
              {GENRES.map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={[styles.genreCard, { backgroundColor: item.color }]}
                  activeOpacity={0.8}
                  onPress={() => handleSelectGenre(item)}
                >
                  <Text style={styles.genreText}>{item.name}</Text>
                  <Ionicons
                    name="musical-notes"
                    size={40}
                    color="rgba(0, 0, 0, 0.2)"
                    style={styles.genreIcon}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
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
    paddingHorizontal: 16,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 90,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  cardImg: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  artistImgRound: {
    borderRadius: 24,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  cardSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  browseSection: {
    flex: 1,
  },
  browseTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  genresWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  genreCard: {
    width: '48%',
    height: 88,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
    marginBottom: 4,
  },
  genreText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  genreIcon: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    transform: [{ rotate: '25deg' }],
  },
});
