import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { socialApi } from '../../api/socialApi';
import { Alert } from '../../utils/alert';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';

export const ChatScreen = ({ route, navigation }) => {
  const { friendId, friendName } = route.params;
  const { user } = useAuth();
  const { sendChatMessage, latestChatMessage, shareSongWithFriend } = useSocket();
  const { currentSong } = usePlayer();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);

  async function loadChatHistory() {
    setLoading(true);
    try {
      const history = await socialApi.getChatHistory(friendId);
      setMessages(history || []);
    } catch (e) {
      console.warn('Error loading chat history:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const content = input.trim();
    if (await sendChatMessage(friendId, content)) setInput((value) => value === content ? '' : value);
    else Alert.alert('Message not sent', 'Check your connection and try again.');
  };

  const handleShareCurrentSong = async () => {
    if (!currentSong) return;
    const shared = await shareSongWithFriend(friendId, {
      id: currentSong.id,
      title: currentSong.title,
      artist: currentSong.artist,
      image: currentSong.image,
      url: currentSong.url,
      duration: currentSong.duration,
    });
    if (!shared) { Alert.alert('Song not shared', 'Check your connection and try again.'); return; }
    // Send message as well
    const shareText = `🎵 Shared Song: "${currentSong.title}" by ${currentSong.artist}`;
    sendChatMessage(friendId, shareText);
  };

  useEffect(() => {
    loadChatHistory();
  }, [friendId]);

  // Listen to incoming live message from socket
  useEffect(() => {
    if (latestChatMessage) {
      const isFromThisFriend =
        latestChatMessage.senderEmail === friendId ||
        latestChatMessage.receiverEmail === friendId;

      if (isFromThisFriend) {
        setMessages((prev) => {
          // Avoid duplicate by ID
          if (prev.some((m) => m._id === latestChatMessage._id)) return prev;
          return [...prev, latestChatMessage];
        });
      }
    }
  }, [latestChatMessage, friendId]);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.friendTitle}>{friendName || friendId}</Text>
            <Text style={styles.friendSub}>{friendId}</Text>
          </View>

          {currentSong && (
            <TouchableOpacity
              style={styles.shareSongBtn}
              onPress={handleShareCurrentSong}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="musical-notes" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, idx) => item._id || String(idx)}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No messages yet. Say hi! 👋</Text>
            }
            renderItem={({ item }) => {
              const isMe = item.senderEmail !== friendId;
              const timeStr = item.createdAt
                ? new Date(item.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <View
                  style={[
                    styles.messageBubble,
                    isMe ? styles.myBubble : styles.friendBubble,
                  ]}
                >
                  <Text style={[styles.messageText, isMe ? styles.myText : styles.friendText]}>
                    {item.content}
                  </Text>
                  {timeStr ? <Text style={styles.timeText}>{timeStr}</Text> : null}
                </View>
              );
            }}
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            accessibilityLabel="Send message"
            onPress={handleSendMessage}
            disabled={!input.trim()}
          >
            <Ionicons name="send" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  friendTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  friendSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  shareSongBtn: {
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 2,
  },
  friendBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#282828',
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myText: {
    color: '#000',
    fontWeight: '500',
  },
  friendText: {
    color: colors.text,
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#282828',
    borderRadius: 20,
    marginRight: 10,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
