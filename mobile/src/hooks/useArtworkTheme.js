import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { themeFromColor } from '../utils/artworkTheme';

const fallback = themeFromColor(null);
const cache = new Map();
export function useArtworkTheme(uri) {
  const [theme, setTheme] = useState(fallback);
  useEffect(() => {
    let active = true;
    setTheme(cache.get(uri) || fallback);
    if (!uri || Constants.executionEnvironment === 'storeClient') return;
    import('react-native-image-colors').then(({ getColors }) => getColors(uri, { fallback: '#1db954', quality: 'low' })).then((palette) => {
      const color = palette.platform === 'ios' ? palette.background : palette.platform === 'android' ? palette.vibrant || palette.dominant : palette.vibrant;
      const next = themeFromColor(color);
      if (cache.size >= 60) cache.delete(cache.keys().next().value);
      cache.set(uri, next);
      if (active) setTheme(next);
    }).catch(() => {});
    return () => { active = false; };
  }, [uri]);
  return theme;
}
