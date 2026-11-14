import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { socialApi } from '../api/socialApi';
import { useSocket } from '../context/SocketContext';

export const ShareSongModal = ({ visible, song, onClose }) => {
  const { shareSongWithFriend } = useSocket();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadFriends() {
    setLoading(true);
    try {
      const data = await socialApi.getFriends();
      setFriends(data || []);
    } catch (e) {
      console.warn('Failed to load friends:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleShareToFriend = (friend) => {
    if (!song) return;
    const friendTarget = friend.email || friend.id;
    const success = shareSongWithFriend(friendTarget, {
      id: song.id,
      title: song.title || song.name,
      artist: song.artist,
      image: song.image,
      url: song.url,
      duration: song.duration,
    });

    if (success) {
      Alert.alert('Song Shared', `Sent "${song.title || song.name}" to ${friend.name || friendTarget}! 🎵`);
      onClose();
    } else {
      Alert.alert('Notice', 'Live socket offline, song could not be broadcasted right now.');
    }
  };

  useEffect(() => {
    if (visible) {
      loadFriends();
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
          <View style={styles.header}>
            <Text style={styles.title}>Share to Friend</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {song && (
            <Text style={styles.songSubtitle} numberOfLines={1}>
              {song.title || song.name} • {song.artist}
            </Text>
          )}

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 24 }} />
          ) : friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You have no friends added yet.</Text>
              <Text style={styles.emptySub}>Add friends in the Social tab to share live music!</Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item, index) => item.email || item.id || String(index)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.friendItem}
                  onPress={() => handleShareToFriend(item)}
                >
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={20} color={colors.text} />
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{item.name || 'Friend'}</Text>
                    <Text style={styles.friendEmail}>{item.email || item.id}</Text>
                  </View>
                  <Ionicons name="paper-plane" size={20} color={colors.primary} />
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
    maxHeight: '70%',
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
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#383838',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  friendEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
});
