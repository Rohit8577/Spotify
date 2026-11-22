import React from 'react';
import { Image } from 'react-native';
import { iconSources } from '../theme/iconSources';

// Native icon images don't depend on a registered font or a font download.
export function Ionicons({ name, size = 12, color = '#000000', style = undefined, ...props }) {
  const source = iconSources[name];
  if (!source) throw new Error('Missing bundled icon: ' + name + '. Run scripts/generate-icons.cjs.');

  return (
    <Image
      accessible={false}
      testID={'icon-' + name}
      {...props}
      source={source}
      resizeMode="contain"
      fadeDuration={0}
      tintColor={color}
      style={[{ width: size, height: size, flexShrink: 0 }, style]}
    />
  );
}

