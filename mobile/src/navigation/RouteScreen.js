import React, { useContext } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { ModalActions } from './RootNavigator';
// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';

// Main Tab Screens
import { HomeScreen } from '../screens/home/HomeScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { LibraryScreen } from '../screens/library/LibraryScreen';
import { FriendsScreen } from '../screens/social/FriendsScreen';
import { AiDjScreen } from '../screens/ai/AiDjScreen';

// Stack / Detail Screens
import { ArtistDetailScreen } from '../screens/home/ArtistDetailScreen';
import { AlbumDetailScreen } from '../screens/home/AlbumDetailScreen';
import { PlaylistDetailScreen } from '../screens/home/PlaylistDetailScreen';
import { LikedSongsScreen } from '../screens/library/LikedSongsScreen';
import { ChatScreen } from '../screens/social/ChatScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { AskAiScreen } from '../screens/ai/AskAiScreen';

export default function RouteScreen() {
  const { screen, ...params } = useLocalSearchParams();
  const screenParams = { ...params, isUserPlaylist: params.isUserPlaylist === 'true' };
  const currentScreen = screen;
  const { handleOpenPlaylistModal, handleOpenShareModal } = useContext(ModalActions) || {};
  const navigation = {
    navigate: (name, values = {}) => router.navigate({ pathname: '/[screen]', params: { screen: name, ...values } }),
    replace: (name, values = {}) => router.replace({ pathname: '/[screen]', params: { screen: name, ...values } }),
    goBack: () => router.canGoBack() ? router.back() : router.replace('/Home'),
  };
  if (screen === 'Login') return <LoginScreen navigation={navigation} />;
  if (screen === 'Signup') return <SignupScreen navigation={navigation} />;
  if (screen === 'ForgotPassword') return <ForgotPasswordScreen navigation={navigation} />;
    switch (currentScreen) {
      case 'Home':
        return <HomeScreen navigation={navigation} />;
      case 'Search':
        return (
          <SearchScreen
            navigation={navigation}
           
            onOpenPlaylistModal={handleOpenPlaylistModal}
            onOpenShareModal={handleOpenShareModal}
          />
        );
      case 'Library':
        return <LibraryScreen navigation={navigation} />;
      case 'Social':
        return <FriendsScreen navigation={navigation} />;
      case 'AiDj':
        return <AiDjScreen navigation={navigation} />;
      case 'ArtistDetail':
        return <ArtistDetailScreen navigation={navigation} route={{ params: screenParams }} />;
      case 'AlbumDetail':
        return <AlbumDetailScreen navigation={navigation} route={{ params: screenParams }} />;
      case 'PlaylistDetail':
        return <PlaylistDetailScreen navigation={navigation} route={{ params: screenParams }} />;
      case 'LikedSongs':
        return <LikedSongsScreen navigation={navigation} />;
      case 'Chat':
        return <ChatScreen navigation={navigation} route={{ params: screenParams }} />;
      case 'Profile':
        return <ProfileScreen navigation={navigation} />;
      case 'AskAi':
        return <AskAiScreen navigation={navigation} />;
      default:
        return <HomeScreen navigation={navigation} />;
    }

}
