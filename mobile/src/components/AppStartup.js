import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

// Native controls use bundled images, so startup doesn't wait on an icon font.
export function AppStartup({ children }) {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return children;
}
