import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import { musicApi } from '../../api/musicApi';
import { aiApi } from '../../api/aiApi';
import { SectionHeader } from '../../components/SectionHeader';

export const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { playSong } = usePlayer();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Home module states
  const [trending, setTrending] = useState([]);
  const [charts, setCharts] = useState([]);
  const [featuredArtists, setFeaturedArtists] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [aiVibe, setAiVibe] = useState('');

  const [activeChip, setActiveChip] = useState('All');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch JioSaavn Home Modules
      const modulesRes = await musicApi.getHomeModules();
      const allData = modulesRes?.data?.data || modulesRes?.data || {};

      if (allData.trending?.data) setTrending(allData.trending.data);
      if (allData.charts?.data) setCharts(allData.charts.data);
      if (allData.artist_recos?.data) setFeaturedArtists(allData.artist_recos.data);
      if (allData.playlists?.data) setPlaylists(allData.playlists.data);
      if (allData.albums?.data) setAlbums(allData.albums.data);

      const newReleasesKey = Object.keys(allData).find((key) =>
        allData[key]?.title?.includes('New Releases')
      );
      if (newReleasesKey && allData[newReleasesKey]?.data) {
        setNewReleases(allData[newReleasesKey].data);
      }

      // 2. Fetch Personalized AI Recommendations
      setLoading(false);
      try {
        const recoRes = await aiApi.getAiRecommendations();
        if (recoRes.success && recoRes.songs?.length) {
          setAiRecommendations(recoRes.songs);
          if (recoRes.aiVibe) setAiVibe(recoRes.aiVibe);
        }
      } catch (aiErr) {
        // Fallback gracefully
      }
    } catch (err) {
      console.warn('Error loading home data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePlayCard = async (item, sourceList = []) => {
    if (item.type === 'song' || (!['album', 'artist', 'playlist'].includes(item.type) && (item.url || item.songUrl || item.download_url))) {
      // Direct song play
      await playSong(item, sourceList.length > 0 ? sourceList : [item]);
    } else if (item.type === 'album') {
      navigation.navigate('AlbumDetail', { albumId: item.id, title: item.name });
    } else if (item.type === 'artist') {
      navigation.navigate('ArtistDetail', { artistId: item.id, name: item.name });
    } else if (item.type === 'playlist') {
      navigation.navigate('PlaylistDetail', {
        playlistId: item.id,
        title: item.name,
        image: Array.isArray(item.image) ? item.image[2]?.link : item.image,
      });
    } else {
      // Default to trying to fetch details or play
      try {
        const res = await musicApi.getSongDetails(item.id);
        const s = res.data?.songs?.[0] || res.data?.data?.songs?.[0];
        if (s) {
          await playSong(s, [s]);
        }
      } catch (e) {
        console.warn('Could not play item:', e);
      }
    }
  };

  const renderCard = ({ item }, list = []) => {
    const imgSrc =
      (Array.isArray(item.image) ? item.image[2]?.link || item.image[1]?.link : item.image) ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4';
    const title = item.name || item.title || 'Untitled';
    const subtitle = item.subtitle || item.artist || item.year || item.type || '';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => handlePlayCard(item, list)}
      >
        <Image source={{ uri: imgSrc }} style={styles.cardImage} />
        <Text style={styles.cardTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderArtistCard = ({ item }) => {
    const imgSrc =
      (Array.isArray(item.image) ? item.image[2]?.link || item.image[1]?.link : item.image) ||
      'https://cdn-icons-png.flaticon.com/512/847/847969.png';

    return (
      <TouchableOpacity
        style={styles.artistCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ArtistDetail', { artistId: item.id, name: item.name })}
      >
        <Image source={{ uri: imgSrc }} style={styles.artistImage} />
        <Text style={styles.artistName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.artistRole}>Artist</Text>
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('AiDj')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="sparkles" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Profile')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="person-circle-outline" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.chipRow}>
        {['All', 'Music', 'AI Mix', 'Playlists'].map((chip) => {
          const isActive = activeChip === chip;
          return (
            <TouchableOpacity
              key={chip}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setActiveChip(chip)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {chip}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading tunes...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* AI Recommended For You */}
          {aiRecommendations.length > 0 && (
            <View>
              <SectionHeader
                title="Made For You"
                subtitle={aiVibe || 'Personalized by SangeetX AI'}
              />
              <FlatList
                horizontal
                data={aiRecommendations}
                renderItem={(info) => renderCard(info, aiRecommendations)}
                keyExtractor={(item, idx) => `reco_${item.id || idx}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
            </View>
          )}

          {/* Quick AI DJ Banner */}
          <TouchableOpacity
            style={styles.aiBanner}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AiDj')}
          >
            <View style={styles.aiBannerIcon}>
              <Ionicons name="sparkles" size={26} color="#000" />
            </View>
            <View style={styles.aiBannerInfo}>
              <Text style={styles.aiBannerTitle}>AI DJ & Smart Playlist</Text>
              <Text style={styles.aiBannerDesc}>
                Tell AI your mood or vibe & get an instant curated mix.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Trending Today */}
          {trending.length > 0 && (
            <View>
              <SectionHeader title="Trending Now" />
              <FlatList
                horizontal
                data={trending}
                renderItem={(info) => renderCard(info, trending)}
                keyExtractor={(item, idx) => `trend_${item.id || idx}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
            </View>
          )}

          {/* Featured Artists */}
          {featuredArtists.length > 0 && (
            <View>
              <SectionHeader title="Popular Artists" />
              <FlatList
                horizontal
                data={featuredArtists}
                renderItem={renderArtistCard}
                keyExtractor={(item, idx) => `artist_${item.id || idx}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
            </View>
          )}

          {/* Top Charts */}
          {charts.length > 0 && (
            <View>
              <SectionHeader title="Charts & Hits" />
              <FlatList
                horizontal
                data={charts}
                renderItem={(info) => renderCard(info, charts)}
                keyExtractor={(item, idx) => `chart_${item.id || idx}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
            </View>
          )}

          {/* New Releases */}
          {newReleases.length > 0 && (
            <View>
              <SectionHeader title="New Releases" />
              <FlatList
                horizontal
                data={newReleases}
                renderItem={(info) => renderCard(info, newReleases)}
                keyExtractor={(item, idx) => `rel_${item.id || idx}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
            </View>
          )}

          {/* Hot Albums */}
          {albums.length > 0 && (
            <View>
              <SectionHeader title="Featured Albums" />
              <FlatList
                horizontal
                data={albums}
                renderItem={(info) => renderCard(info, albums)}
                keyExtractor={(item, idx) => `album_${item.id || idx}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
            </View>
          )}

          {/* Popular Playlists */}
          {playlists.length > 0 && (
            <View>
              <SectionHeader title="Featured Playlists" />
              <FlatList
                horizontal
                data={playlists}
                renderItem={(info) => renderCard(info, playlists)}
                keyExtractor={(item, idx) => `pl_${item.id || idx}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    marginLeft: 14,
    padding: 4,
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  horizontalList: {
    paddingHorizontal: 16,
    gap: 14,
  },
  card: {
    width: 140,
  },
  cardImage: {
    width: 140,
    height: 140,
    borderRadius: 8,
    backgroundColor: colors.card,
    marginBottom: 8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  artistCard: {
    width: 110,
    alignItems: 'center',
  },
  artistImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    marginBottom: 8,
  },
  artistName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  artistRole: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 185, 84, 0.12)',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.3)',
  },
  aiBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiBannerInfo: {
    flex: 1,
  },
  aiBannerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  aiBannerDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
