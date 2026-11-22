import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from './Icon';
import { colors } from '../theme/colors';
import { playlistApi } from '../api/playlistApi';
import { Alert } from '../utils/alert';

export const AddToPlaylistModal = ({ visible, song, onClose }) => {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);

  async function loadPlaylists() {
    setLoading(true);
    try {
      const data = await playlistApi.getLibrary();
      setPlaylists(data.array || []);
    } catch (e) {
      console.warn('Failed to load playlists:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    setCreating(true);
    try {
      const res = await playlistApi.createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowNewInput(false);
      await loadPlaylists();
      Alert.alert('Playlist Created', res.msg || 'Playlist created successfully!');
    } catch (e) {
      Alert.alert('Error', 'Could not create playlist.');
    } finally {
      setCreating(false);
    }
  };

  const handleSelectPlaylist = async (playlistName) => {
    if (!song) return;
    try {
      const res = await playlistApi.addSongToPlaylist({
        playlistName,
        song,
      });
      Alert.alert('Success', res.msg || `Added to ${playlistName}!`);
      onClose();
    } catch (e) {
      Alert.alert('Error', 'Failed to add song to playlist.');
    }
  };

  useEffect(() => {
    if (visible) {
      loadPlaylists();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add to Playlist</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {song && (
            <Text style={styles.songSubtitle} numberOfLines={1}>
              {song.title || song.name} • {song.artist}
            </Text>
          )}

          {/* Create New Playlist Button / Input */}
          {showNewInput ? (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Playlist name"
                placeholderTextColor={colors.textSecondary}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                autoFocus
              />
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleCreatePlaylist}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.newPlaylistBtn}
              onPress={() => setShowNewInput(true)}
            >
              <Ionicons name="add" size={22} color={colors.primary} />
              <Text style={styles.newPlaylistText}>New Playlist</Text>
            </TouchableOpacity>
          )}

          {/* Playlists List */}
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : playlists.length === 0 ? (
            <Text style={styles.emptyText}>No playlists yet. Create one above!</Text>
          ) : (
            <FlatList
              data={playlists}
              keyExtractor={(item, index) => item.name || String(index)}
              style={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.playlistItem}
                  onPress={() => handleSelectPlaylist(item.name)}
                >
                  <View style={styles.playlistIcon}>
                    <Ionicons name="musical-notes" size={20} color={colors.text} />
                  </View>
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.playlistCount}>
                      {item.songs ? `${item.songs.length} songs` : 'Playlist'}
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#202020',
    borderRadius: 16,
    padding: 20,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  songSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  newPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
  },
  newPlaylistText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#303030',
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  saveBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  list: {
    marginTop: 8,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  playlistIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playlistName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  playlistCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: 24,
    fontSize: 14,
  },
});
