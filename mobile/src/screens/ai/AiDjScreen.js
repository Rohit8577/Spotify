import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { aiApi } from '../../api/aiApi';
import { playlistApi } from '../../api/playlistApi';
import { usePlayer } from '../../context/PlayerContext';
import { SongItem } from '../../components/SongItem';
import { Alert } from '../../utils/alert';

const SUGGESTIONS = [
  'Late night drive Hindi & English lo-fi',
  'High energy gym phonk & bass boost',
  'Rainy day acoustic & sad Bollywood',
  'Instagram reels trending & viral hits',
  '90s Bollywood romantic nostalgia',
  'Upbeat energetic pop & party mix',
];

export const AiDjScreen = ({ navigation }) => {
  const { playSong } = usePlayer();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [playlist, setPlaylist] = useState([]);
  const [currentVibe, setCurrentVibe] = useState('');
  const [saving, setSaving] = useState(false);

  const handleGenerate = async (vibeText) => {
    const query = vibeText || prompt;
    if (!query.trim()) {
      Alert.alert('Vibe Required', 'Please enter your mood or choose a vibe.');
      return;
    }

    setLoading(true);
    setCurrentVibe(query.trim());
    try {
      const res = await aiApi.getSmartPlaylist(query.trim());
      if (res.success && res.songs?.length) {
        setPlaylist(res.songs);
      } else {
        Alert.alert('Notice', 'AI could not find matching tracks. Try a different mood.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to generate playlist with AI.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAll = () => {
    if (playlist.length > 0) {
      playSong(playlist[0], playlist, 0);
    }
  };

  const handleSaveToLibrary = async () => {
    if (playlist.length === 0) return;
    setSaving(true);
    try {
      const playlistName = `AI Mix: ${currentVibe.slice(0, 20)}`;
      await playlistApi.createPlaylist(playlistName);

      // Add songs to the playlist sequentially
      for (const s of playlist) {
        await playlistApi.addSongToPlaylist({
          playlistName,
          song: s,
        });
      }
      Alert.alert('Saved!', `Playlist "${playlistName}" added to your library! 🎧`);
    } catch (e) {
      Alert.alert('Error', 'Could not save playlist to library.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="sparkles" size={20} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.title}>AI DJ Playlist Curator</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('AskAi')}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Input Box */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Describe your vibe (e.g. Chill Punjabi lofi for study)"
            placeholderTextColor={colors.textSecondary}
            value={prompt}
            onChangeText={setPrompt}
            multiline
          />
          <TouchableOpacity
            style={[styles.generateBtn, loading && styles.btnDisabled]}
            accessibilityLabel="Generate playlist"
            onPress={() => handleGenerate()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Ionicons name="arrow-forward" size={20} color="#000" />
            )}
          </TouchableOpacity>
        </View>

        {/* Suggestions chips */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsLabel}>Try these vibes:</Text>
          <FlatList
            horizontal
            data={SUGGESTIONS}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionChip}
                onPress={() => {
                  setPrompt(item);
                  handleGenerate(item);
                }}
              >
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Generated Playlist Content */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingTitle}>Curating your personalized mix...</Text>
            <Text style={styles.loadingSub}>Analyzing mood, genre, tempo & viral trends.</Text>
          </View>
        ) : playlist.length > 0 ? (
          <View style={styles.resultsBox}>
            <View style={styles.resultsHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultsTitle} numberOfLines={1}>
                  {currentVibe}
                </Text>
                <Text style={styles.resultsCount}>{playlist.length} tracks curated</Text>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveToLibrary} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
                    <Text style={styles.saveBtnText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.playBtn} onPress={handlePlayAll}>
                <Ionicons name="play" size={20} color="#000" />
                <Text style={styles.playBtnText}>Play All</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={playlist}
              keyExtractor={(item, idx) => item.id || String(idx)}
              contentContainerStyle={{ paddingBottom: 100 }}
              renderItem={({ item, index }) => (
                <SongItem
                  song={item}
                  index={index}
                  showIndex
                  onPress={() => playSong(item, playlist, index)}
                />
              )}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={54} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Your AI-Curated Playlist awaits</Text>
            <Text style={styles.emptyDesc}>
              Type any mood, movie vibe, road-trip, gym set, or choose a chip above.
            </Text>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.4)',
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    minHeight: 44,
  },
  generateBtn: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  suggestionsContainer: {
    marginTop: 14,
    marginBottom: 8,
  },
  suggestionsLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  suggestionChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionText: {
    color: colors.text,
    fontSize: 12,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
  },
  loadingSub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  resultsBox: {
    flex: 1,
    marginTop: 8,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
  },
  resultsTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  resultsCount: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  saveBtnText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  playBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  playBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
