import React from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { PlayerProvider } from './src/context/PlayerContext';
import { SocketProvider } from './src/context/SocketContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NotificationProvider } from './src/context/NotificationContext';
import { UpdateProvider } from './src/context/UpdateContext';
import { AppStartup } from './src/components/AppStartup';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  return (
    <AppStartup>
      <SafeAreaProvider>
        <AuthProvider>
          <SessionProviders />
        </AuthProvider>
      </SafeAreaProvider>
    </AppStartup>
  );
}

function SessionProviders() {
  const { token, serverUrl } = useAuth();
  return (
    <PlayerProvider key={serverUrl + ':' + (token || 'guest')}>
      <SocketProvider>
        <NotificationProvider>
          <UpdateProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </UpdateProvider>
        </NotificationProvider>
      </SocketProvider>
    </PlayerProvider>
  );
}
