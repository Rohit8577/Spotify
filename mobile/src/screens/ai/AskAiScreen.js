import React, { useState, useRef, useEffect } from 'react';
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
import { aiApi } from '../../api/aiApi';

const PROMPT_SUGGESTIONS = [
  'Recommend 5 dark synthwave songs like Starboy',
  'Who wrote the lyrics for Arijit Singh’s Tum Hi Ho?',
  'Explain the meaning behind Bohemian Rhapsody',
  'Best 90s rock ballads of all time',
];

export const AskAiScreen = ({ navigation }) => {
  const [messages, setMessages] = useState(() => [
    {
      id: '1',
      sender: 'ai',
      text: 'Hey! I am your SangeetX AI Music Assistant. Ask me anything about songs, artists, lyrics, history, or music theory!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  const handleSend = async (customText) => {
    const textToSend = typeof customText === 'string' ? customText : input;
    if (loading) return;
    if (!textToSend.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiApi.askAi(textToSend.trim());
      const answer = res.answer || res.text || 'I could not generate an answer right now.';
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: answer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Sorry, the AI service is currently busy or unreachable. Please try again shortly.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages, loading]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>SangeetX AI Chat</Text>
            <Text style={styles.headerSub}>Always online</Text>
          </View>
          <Ionicons name="sparkles" size={20} color={colors.primary} />
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => {
            const isUser = item.sender === 'user';
            return (
              <View
                style={[
                  styles.messageBubble,
                  isUser ? styles.userBubble : styles.aiBubble,
                ]}
              >
                {!isUser && (
                  <View style={styles.aiBadge}>
                    <Ionicons name="sparkles" size={12} color="#000" />
                    <Text style={styles.aiBadgeText}>AI DJ</Text>
                  </View>
                )}
                <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
                  {item.text}
                </Text>
                <Text style={styles.messageTime}>{item.time}</Text>
              </View>
            );
          }}
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.thinkingText}>AI thinking...</Text>
              </View>
            ) : null
          }
        />

        {/* Quick Suggestion Pills */}
        {messages.length <= 2 && (
          <View style={styles.promptPillsRow}>
            <FlatList
              horizontal
              data={PROMPT_SUGGESTIONS}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.promptPill}
                  onPress={() => handleSend(item)}
                >
                  <Text style={styles.promptPillText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Chat Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask about music, trivia, recommendations..."
            placeholderTextColor={colors.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            accessibilityLabel="Send to AI"
            onPress={() => handleSend()}
            disabled={!input.trim() || loading}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  headerSub: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  messageList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  aiBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 3,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#000',
    fontWeight: '500',
  },
  aiText: {
    color: colors.text,
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 12,
  },
  thinkingText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: 8,
  },
  promptPillsRow: {
    paddingVertical: 8,
  },
  promptPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  promptPillText: {
    color: colors.textSecondary,
    fontSize: 12,
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
    paddingHorizontal: 12,
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
