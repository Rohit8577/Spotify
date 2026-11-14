import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';

export const ProfileScreen = ({ navigation }) => {
  const { user, serverUrl, updateServerUrl, logout } = useAuth();
  const { setIsEqualizerVisible } = usePlayer();

  const [customUrl, setCustomUrl] = useState(serverUrl);

  const handleSaveUrl = async () => {
    if (!customUrl.trim()) return;
    await updateServerUrl(customUrl.trim());
    Alert.alert('Server Updated', `Backend API URL saved as:\n${customUrl.trim()}`);
  };

  const handleSetPresetUrl = async (url) => {
    setCustomUrl(url);
    await updateServerUrl(url);
    Alert.alert('Preset Applied', `Connected to: ${url}`);
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of SangeetX?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Profile & Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'SangeetX User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.lib?.length || 0}</Text>
              <Text style={styles.statLabel}>Playlists</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.artist?.length || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        </View>

        {/* Settings Sections */}
        <Text style={styles.sectionTitle}>AUDIO & PLAYBACK</Text>
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setIsEqualizerVisible(true)}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="options-outline" size={22} color={colors.primary} />
              <Text style={styles.menuText}>Equalizer & AI Auto-Tune</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AiDj')}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
              <Text style={styles.menuText}>AI Smart DJ Playlist</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AskAi')}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
              <Text style={styles.menuText}>Ask SangeetX AI Music Bot</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Backend Server Configuration */}
        <Text style={styles.sectionTitle}>BACKEND SERVER URL</Text>
        <View style={styles.configCard}>
          <Text style={styles.configDesc}>
            Current API Endpoint:
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.urlInput}
              value={customUrl}
              onChangeText={setCustomUrl}
              placeholder="http://localhost:5000"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.saveUrlBtn} onPress={handleSaveUrl}>
              <Text style={styles.saveUrlBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Preset Buttons */}
          <Text style={styles.presetsLabel}>Quick Presets:</Text>
          <View style={styles.presetsRow}>
            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => handleSetPresetUrl('http://localhost:5000')}
            >
              <Text style={styles.presetText}>Localhost (5000)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => handleSetPresetUrl('http://10.0.2.2:5000')}
            >
              <Text style={styles.presetText}>Android Emulator</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetChip}
              onPress={() => handleSetPresetUrl('http://65.0.27.213:5000')}
            >
              <Text style={styles.presetText}>AWS EC2 Live</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Log out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>SangeetX Mobile v1.0.0 • Expo React Native</Text>
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
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    alignItems: 'center',
    padding: 24,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#7D40E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  menuSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
  configCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  configDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  urlInput: {
    flex: 1,
    backgroundColor: '#282828',
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  saveUrlBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    marginLeft: 8,
  },
  saveUrlBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 13,
  },
  presetsLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  presetText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(233, 20, 41, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 28,
  },
  logoutText: {
    color: colors.error,
    fontWeight: '700',
    fontSize: 15,
  },
  versionText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 11,
    marginTop: 24,
  },
});
