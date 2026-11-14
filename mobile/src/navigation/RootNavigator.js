import React, { useState, createContext } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

import { Slot, router, usePathname } from 'expo-router';
// Floating Components
import { MiniPlayer } from '../components/MiniPlayer';
import { FullPlayerModal } from '../components/FullPlayerModal';
import { EqualizerModal } from '../components/EqualizerModal';
import { LyricsModal } from '../components/LyricsModal';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import { ShareSongModal } from '../components/ShareSongModal';
import { SharedSongNotification } from '../components/SharedSongNotification';

export const ModalActions = createContext(null);
export const RootNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  const currentScreen = usePathname().split('/').filter(Boolean)[0] || 'Home';
  const activeTab = currentScreen;
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [targetSong, setTargetSong] = useState(null);
  const navigation = { navigate: (screen) => router.navigate('/' + screen) };
  const handleOpenPlaylistModal = (song) => {
    setTargetSong(song);
    setPlaylistModalVisible(true);
  };

  const handleOpenShareModal = (song) => {
    setTargetSong(song);
    setShareModalVisible(true);
  };

  // If loading session
  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <Ionicons name="musical-notes" size={54} color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) return <Slot />;
  return (
    <ModalActions.Provider value={{ handleOpenPlaylistModal, handleOpenShareModal }}>
    <View style={styles.appContainer}>
      {/* Live Incoming Shared Song Notification */}
      <SharedSongNotification />

      {/* Main Screen Body */}
      <View style={styles.screenWrapper}><Slot /></View>

      {/* Mini Audio Player (Docked above tabs) */}
      <MiniPlayer />

      {/* Bottom Navigation Bar */}
      <SafeAreaView style={styles.tabBarSafeArea}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('Home')}
          >
            <Ionicons
              name={activeTab === 'Home' ? 'home' : 'home-outline'}
              size={22}
              color={activeTab === 'Home' ? colors.text : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, activeTab === 'Home' && styles.tabLabelActive]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('Search')}
          >
            <Ionicons
              name={activeTab === 'Search' ? 'search' : 'search-outline'}
              size={22}
              color={activeTab === 'Search' ? colors.text : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, activeTab === 'Search' && styles.tabLabelActive]}>
              Search
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('Library')}
          >
            <Ionicons
              name={activeTab === 'Library' ? 'library' : 'library-outline'}
              size={22}
              color={activeTab === 'Library' ? colors.text : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, activeTab === 'Library' && styles.tabLabelActive]}>
              Library
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('AiDj')}
          >
            <Ionicons
              name={activeTab === 'AiDj' ? 'sparkles' : 'sparkles-outline'}
              size={22}
              color={activeTab === 'AiDj' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, activeTab === 'AiDj' && styles.tabLabelAi]}>
              AI DJ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('Social')}
          >
            <Ionicons
              name={activeTab === 'Social' ? 'people' : 'people-outline'}
              size={22}
              color={activeTab === 'Social' ? colors.text : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, activeTab === 'Social' && styles.tabLabelActive]}>
              Social
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Global Modals */}
      <FullPlayerModal
        onOpenPlaylistModal={handleOpenPlaylistModal}
        onOpenShareModal={handleOpenShareModal}
      />
      <EqualizerModal />
      <LyricsModal />
      <AddToPlaylistModal
        visible={playlistModalVisible}
        song={targetSong}
        onClose={() => setPlaylistModalVisible(false)}
      />
      <ShareSongModal
        visible={shareModalVisible}
        song={targetSong}
        onClose={() => setShareModalVisible(false)}
      />
    </View>
    </ModalActions.Provider>
  );
};

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenWrapper: {
    flex: 1,
  },
  tabBarSafeArea: {
    backgroundColor: '#121212',
  },
  tabBar: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 3,
  },
  tabLabelActive: {
    color: colors.text,
  },
  tabLabelAi: {
    color: colors.primary,
    fontWeight: '700',
  },
});
