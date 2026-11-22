import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme/colors';

export function AppStartup({ children }) {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (fontsLoaded) return children;

  return (
    <View style={styles.startupScreen}>
      <StatusBar style="light" />
      {fontError ? (
        <>
          <Text style={styles.startupMessage}>{"SangeetX couldn't finish loading. Please try again."}</Text>
          {/* A reload clears the cached CSS rule after a failed web font load. */}
          <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()} accessibilityRole="button">
            <Text style={styles.retryLabel}>Try again</Text>
          </TouchableOpacity>
        </>
      ) : (
        <ActivityIndicator color={colors.primary} size="large" accessibilityLabel="Loading SangeetX" />
      )}
    </View>
  );
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
