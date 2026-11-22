import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { socialApi } from '../../api/socialApi';
import { Alert } from '../../utils/alert';
import { useSocket } from '../../context/SocketContext';
import { usePlayer } from '../../context/PlayerContext';

export const FriendsScreen = ({ navigation }) => {
  const { friendActivities, isConnected } = useSocket();
  const { playSong } = usePlayer();

  const [activeTab, setActiveTab] = useState('activity'); // 'activity' | 'friends'
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search/Add Friend Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const loadSocialData = useCallback(async () => {
    try {
      setRequests(await socialApi.getRequests());
      const [friendsList, actList] = await Promise.all([
        socialApi.getFriends().catch(() => []),
        socialApi.getFriendsActivity().catch(() => []),
      ]);
      setFriends(friendsList || []);
      setActivities(actList || []);
    } catch (e) {
      console.warn('Error fetching social data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await socialApi.searchFriends(searchQuery.trim());
      setSearchResults(results || []);
    } catch (e) {
      Alert.alert('Error', 'Could not search users.');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (email) => {
    try {
      const res = await socialApi.sendFriendRequest(email);
      Alert.alert('Request Sent', res.msg || 'Friend request sent!');
    } catch (e) {
      Alert.alert('Notice', 'Request could not be sent.');
    }
  };

  const openChatWithFriend = (friend) => {
    navigation.navigate('Chat', {
      friendId: friend.email || friend.id,
      friendName: friend.name || friend.email,
    });
  };

  useEffect(() => {
    loadSocialData();
  }, [loadSocialData]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Friend Activity</Text>
            <View style={styles.socketStatusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isConnected ? colors.primary : colors.textMuted },
                ]}
              />
              <Text style={styles.statusText}>
                {isConnected ? 'Live sync online' : 'Offline'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addFriendBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="person-add-outline" size={20} color="#000" />
            <Text style={styles.addFriendText}>Add Friend</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Filter Chips */}
        <View style={styles.tabRow}>
          {[
            { id: 'activity', label: 'Live Listening Activity' },
            { id: 'friends', label: `My Friends (${friends.length})` },
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

        {requests.map((request) => <View key={request.email} style={styles.tabRow}>
          <Text style={{ color: colors.text, flex: 1 }}>{request.email}</Text>
          {[true, false].map((accept) => <TouchableOpacity key={String(accept)} style={styles.tabChip}
            onPress={async () => {
              try { await socialApi.respondToRequest(request.email, accept); await loadSocialData(); }
              catch { Alert.alert('Request failed', 'Please try again.'); }
            }}><Text style={styles.tabText}>{accept ? 'Accept' : 'Reject'}</Text></TouchableOpacity>)}
        </View>)}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : activeTab === 'activity' ? (
          /* Live Friends Activity */
          <FlatList
            data={activities}
            keyExtractor={(item, idx) => item.id || String(idx)}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>No Friend Activity Yet</Text>
                <Text style={styles.emptySub}>
                  Add friends to see what songs they are currently jamming to!
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              // Real-time live track override if socket broadcast received
              const liveTrack = friendActivities[item.name || item.id];
              const statusText = liveTrack
                ? `Listening to ${liveTrack.title || liveTrack.name}`
                : item.status || 'Offline';

              return (
                <TouchableOpacity
                  style={styles.activityCard}
                  activeOpacity={0.8}
                  onPress={() => openChatWithFriend(item)}
                >
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={22} color={colors.text} />
                  </View>

                  <View style={styles.activityInfo}>
                    <Text style={styles.friendName}>{item.name || 'Friend'}</Text>
                    <View style={styles.statusRow}>
                      <Ionicons
                        name="musical-notes"
                        size={14}
                        color={liveTrack ? colors.primary : colors.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.statusTextLine,
                          liveTrack && { color: colors.primary, fontWeight: '600' },
                        ]}
                        numberOfLines={1}
                      >
                        {statusText}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.chatIconBtn}
                    onPress={() => openChatWithFriend(item)}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.text} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          /* Friends List */
          <FlatList
            data={friends}
            keyExtractor={(item, idx) => item.email || item.id || String(idx)}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No friends added yet.</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.activityCard}
                onPress={() => openChatWithFriend(item)}
              >
                <View style={styles.avatar}>
                  <Ionicons name="person" size={20} color={colors.text} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.friendName}>{item.name || 'Friend'}</Text>
                  <Text style={styles.friendEmail}>{item.email || item.id}</Text>
                </View>
                <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          />
        )}

        {/* Add Friend Search Modal */}
        <Modal visible={showAddModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Find & Add Friends</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalSearchRow}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Search by name or email..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.modalSearchBtn}
                  accessibilityLabel="Search people"
                  onPress={handleSearchUsers}
                  disabled={searching}
                >
                  {searching ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Ionicons name="search" size={18} color="#000" />
                  )}
                </TouchableOpacity>
              </View>

              <FlatList
                data={searchResults}
                keyExtractor={(item) => item._id || item.email}
                style={{ maxHeight: 300, marginTop: 12 }}
                renderItem={({ item }) => (
                  <View style={styles.searchUserRow}>
                    <View style={styles.avatarSmall}>
                      <Ionicons name="person" size={16} color={colors.text} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.searchUserName}>{item.name}</Text>
                      <Text style={styles.searchUserEmail}>{item.email}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.requestBtn}
                      onPress={() => handleSendRequest(item.email)}
                    >
                      <Text style={styles.requestBtnText}>Request</Text>
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  searchQuery && !searching ? (
                    <Text style={styles.emptyText}>No users found.</Text>
                  ) : null
                }
              />
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
    paddingVertical: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  socketStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  addFriendBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addFriendText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 6,
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
  listContent: {
    paddingBottom: 90,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  friendEmail: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusTextLine: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  chatIconBtn: {
    padding: 6,
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
    textAlign: 'center',
    paddingHorizontal: 20,
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#202020',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalInput: {
    flex: 1,
    backgroundColor: '#303030',
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
  },
  modalSearchBtn: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  searchUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#383838',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchUserName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  searchUserEmail: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  requestBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  requestBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
});
