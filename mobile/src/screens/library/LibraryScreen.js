import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import { playlistApi } from '../../api/playlistApi';
import { musicApi } from '../../api/musicApi';
import { SongItem } from '../../components/SongItem';
import { Alert } from '../../utils/alert';

export const LibraryScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { playSong } = usePlayer();

  const [activeTab, setActiveTab] = useState('playlists'); // 'playlists' | 'recent' | 'artists'
  const [playlists, setPlaylists] = useState([]);
  const [recentSongs, setRecentSongs] = useState([]);
  const [followingArtists, setFollowingArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create playlist modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // 1. Playlists
      const plData = await playlistApi.getLibrary();
      setPlaylists(plData.array || []);

      // 2. Recently Played
      const recData = await musicApi.getRecentlyPlayed();
      setRecentSongs(recData.arr || []);

      // 3. Artists
      if (user?.artist) {
        setFollowingArtists(user.artist);
      }
    } catch (e) {
      console.warn('Error fetching library data:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleCreatePlaylist = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await playlistApi.createPlaylist(newTitle.trim());
      setNewTitle('');
      setShowCreateModal(false);
      await loadData();
      Alert.alert('Success', res.msg || 'Playlist created!');
    } catch (e) {
      Alert.alert('Error', 'Could not create playlist.');
    } finally {
      setCreating(false);
    }
  };

  const renderPlaylistsView = () => (
    <View style={{ flex: 1 }}>
      {/* Pinned Liked Songs Card */}
      <TouchableOpacity
        style={styles.playlistRow}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('LikedSongs')}
      >
        <LinearGradient colors={['#450af5', '#8e8ee5']} style={styles.likedCover}>
          <Ionicons name="heart" size={24} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.playlistInfo}>
          <Text style={styles.playlistName}>Liked Songs</Text>
          <Text style={styles.playlistMeta}>Pinned • Playlist</Text>
        </View>
        <Ionicons name="pin" size={16} color={colors.primary} />
      </TouchableOpacity>

      {/* User Created Playlists */}
      <FlatList
        data={playlists}
        keyExtractor={(item, index) => item.name || String(index)}
        contentContainerStyle={{ paddingBottom: 90 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.playlistRow}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('PlaylistDetail', {
                playlistId: item.name,
                title: item.name,
                image: item.image,
                isUserPlaylist: true,
              })
            }
          >
            <Image
              source={{
                uri: item.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
              }}
              style={styles.playlistCover}
            />
            <View style={styles.playlistInfo}>
              <Text style={styles.playlistName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.playlistMeta}>
                Playlist • {item.songs ? `${item.songs.length} songs` : '0 songs'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderRecentlyPlayedView = () => (
    <FlatList
      data={recentSongs}
      keyExtractor={(item, index) => item.songId || String(index)}
      contentContainerStyle={{ paddingBottom: 90 }}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No recently played songs yet.</Text>
      }
      renderItem={({ item, index }) => (
        <SongItem
          song={{
            id: item.songId,
            title: item.songName,
            artist: item.artist,
            image: item.image,
            url: item.songUrl,
            duration: item.len,
          }}
          index={index}
          onPress={() => playSong(item, recentSongs, index)}
        />
      )}
    />
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity accessibilityLabel="Open profile" onPress={() => navigation.navigate('Profile')}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.title}>Your Library</Text>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            accessibilityLabel="Create playlist"
            onPress={() => setShowCreateModal(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Tab Filter Chips */}
        <View style={styles.tabRow}>
          {[
            { id: 'playlists', label: 'Playlists' },
            { id: 'recent', label: 'Recently Played' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Body */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : activeTab === 'playlists' ? (
          renderPlaylistsView()
        ) : (
          renderRecentlyPlayedView()
        )}

        {/* Create Playlist Modal */}
        <Modal visible={showCreateModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Give your playlist a name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="My Playlist #1"
                placeholderTextColor={colors.textSecondary}
                value={newTitle}
                onChangeText={setNewTitle}
                autoFocus
              />
              <View style={styles.modalRow}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSave}
                  onPress={handleCreatePlaylist}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.modalSaveText}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7D40E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
  },
  addBtn: {
    padding: 4,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabChipActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  likedCover: {
    width: 54,
    height: 54,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistCover: {
    width: 54,
    height: 54,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playlistName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  playlistMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#202020',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: '#303030',
    borderRadius: 8,
    color: colors.text,
    padding: 12,
    fontSize: 14,
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalSave: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalSaveText: {
    color: '#000',
    fontWeight: '700',
  },
});
