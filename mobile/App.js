import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { PlayerProvider } from './src/context/PlayerContext';
import { SocketProvider } from './src/context/SocketContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SessionProviders />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function SessionProviders() {
  const { token, serverUrl } = useAuth();
  return <PlayerProvider key={`${serverUrl}:${token || 'guest'}`}>
          <SocketProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </SocketProvider>
        </PlayerProvider>;
}
