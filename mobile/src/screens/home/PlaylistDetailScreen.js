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
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../../theme/colors';
import { musicApi } from '../../api/musicApi';
import { playlistApi } from '../../api/playlistApi';
import { usePlayer } from '../../context/PlayerContext';
import { SongItem } from '../../components/SongItem';
import { Alert } from '../../utils/alert';

export const PlaylistDetailScreen = ({ route, navigation }) => {
  const { playlistId, title, image, isUserPlaylist = false } = route.params;
  const { playSong } = usePlayer();

  const [playlistData, setPlaylistData] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Rename modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameText, setRenameText] = useState(title);
  const currentTitle = title;

  async function loadPlaylist() {
    setLoading(true);
    try {
      if (isUserPlaylist) {
        // Fetch user custom library playlist songs
        const res = await playlistApi.getPlaylistSongs(currentTitle);
        setSongs(res.arr || []);
      } else {
        // Fetch JioSaavn playlist
        const res = await musicApi.getPlaylistDetails(playlistId);
        const data = res?.data?.data || res?.data || {};
        setPlaylistData(data);
        const list = data.songs || data.data?.songs || [];
        setSongs(list);
      }
    } catch (e) {
      console.warn('Error loading playlist songs:', e);
    } finally {
      setLoading(false);
    }
  }

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playSong(songs[0], songs, 0);
    }
  };

  const handleDeletePlaylist = () => {
    Alert.alert('Delete Playlist', `Are you sure you want to delete "${currentTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await playlistApi.deletePlaylist(currentTitle);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete playlist');
          }
        },
      },
    ]);
  };

  const handleRenamePlaylist = async () => {
    const nextTitle = renameText.trim();
    if (!nextTitle || nextTitle === currentTitle) {
      setShowRenameModal(false);
      return;
    }
    try {
      await playlistApi.renamePlaylist(currentTitle, nextTitle);
      router.setParams({ title: nextTitle });
      setShowRenameModal(false);
      Alert.alert('Success', 'Playlist renamed successfully');
    } catch (e) {
      Alert.alert('Error', 'Could not rename playlist');
    }
  };

  const handleRemoveSong = (song) => {
    if (!isUserPlaylist) return;
    Alert.alert('Remove Song', `Remove "${song.title || song.songName}" from this playlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await playlistApi.removeSongFromPlaylist(currentTitle, song.id || song.songId);
            setSongs((prev) => prev.filter((s) => (s.id || s.songId) !== (song.id || song.songId)));
          } catch (e) {
            Alert.alert('Error', 'Failed to remove song');
          }
        },
      },
    ]);
  };

  useEffect(() => {
    loadPlaylist();
  }, [playlistId, title]);

  const playlistCover =
    image ||
    (Array.isArray(playlistData?.image) ? playlistData.image[2]?.link : playlistData?.image) ||
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Top Header Actions */}
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          {isUserPlaylist && (
            <View style={styles.userActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => { setRenameText(currentTitle); setShowRenameModal(true); }}
                accessibilityLabel="Rename playlist"
              >
                <Ionicons name="pencil-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={handleDeletePlaylist}
                accessibilityLabel="Delete playlist"
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Header info */}
            <View style={styles.header}>
              <Image source={{ uri: playlistCover }} style={styles.cover} />
              <Text style={styles.title}>{currentTitle}</Text>
              <Text style={styles.meta}>
                {isUserPlaylist ? 'Custom Playlist' : playlistData?.header_desc || 'SangeetX Playlist'} • {songs.length} songs
              </Text>

              <TouchableOpacity style={styles.playBtn} onPress={handlePlayAll}>
                <Ionicons name="play" size={26} color="#000" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>

            {/* Song list */}
            <View style={styles.songList}>
              {songs.length === 0 ? (
                <Text style={styles.emptyText}>No songs in this playlist yet.</Text>
              ) : (
                songs.map((song, idx) => (
                  <SongItem
                    key={song.id || song.songId || String(idx)}
                    song={song}
                    index={idx}
                    showIndex
                    onPress={() => playSong(song, songs, idx)}
                    onOptionsPress={isUserPlaylist ? () => handleRemoveSong(song) : undefined}
                  />
                ))
              )}
            </View>
          </>
        )}

        {/* Rename Modal */}
        <Modal visible={showRenameModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Rename Playlist</Text>
              <TextInput
                style={styles.modalInput}
                accessibilityLabel="Playlist name"
                value={renameText}
                onChangeText={setRenameText}
                autoFocus
              />
              <View style={styles.modalRow}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setShowRenameModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSave}
                  onPress={handleRenamePlaylist}
                >
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
    marginLeft: 8,
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
  meta: {
    fontSize: 13,
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
  songList: {
    paddingHorizontal: 4,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: 40,
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
