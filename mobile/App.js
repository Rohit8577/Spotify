import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { PlayerProvider } from './src/context/PlayerContext';
import { SocketProvider } from './src/context/SocketContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NotificationProvider } from './src/context/NotificationContext';
import { UpdateProvider } from './src/context/UpdateContext';
import { colors } from './src/theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontLoadAttempt, setFontLoadAttempt] = useState(0);
  const retryFonts = () => {
    // A failed web font leaves its CSS rule behind; a reload clears that cache.
    if (Platform.OS === 'web') {
      window.location.reload();
      return;
    }
    setFontLoadAttempt((attempt) => attempt + 1);
  };

  return (
    <IconFontLoader key={fontLoadAttempt} onRetry={retryFonts}>
      <SafeAreaProvider>
        <AuthProvider>
          <SessionProviders />
        </AuthProvider>
      </SafeAreaProvider>
    </IconFontLoader>
  );
}

function IconFontLoader({ children, onRetry }) {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded) {
    return (
      <View style={styles.startupScreen}>
        <StatusBar style="light" />
        {fontError ? (
          <>
            <Text style={styles.startupMessage}>SangeetX couldn't finish loading. Please try again.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRetry} accessibilityRole="button">
              <Text style={styles.retryLabel}>Try again</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ActivityIndicator color={colors.primary} size="large" accessibilityLabel="Loading SangeetX" />
        )}
      </View>
    );
  }

  return children;
}

function SessionProviders() {
  const { token, serverUrl } = useAuth();
  return <PlayerProvider key={`${serverUrl}:${token || 'guest'}`}>
          <SocketProvider>
            <NotificationProvider>
            <UpdateProvider>
            <StatusBar style="light" />
            <RootNavigator />
            </UpdateProvider>
            </NotificationProvider>
          </SocketProvider>
        </PlayerProvider>;
}

const styles = StyleSheet.create({
  startupScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  startupMessage: {
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryLabel: {
    color: colors.background,
    fontWeight: '600',
  },
});
