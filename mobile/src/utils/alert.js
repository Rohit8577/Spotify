import { Alert as NativeAlert, Platform } from 'react-native';

// React Native's Alert has no web implementation. Keep confirmations and their
// callbacks working in the exported Expo web app as well as on phones.
/** @type {Pick<typeof NativeAlert, 'alert'>} */
export const Alert = {
  alert(title, message, buttons, options) {
    if (Platform.OS !== 'web') return NativeAlert.alert(title, message, buttons, options);
    const text = [title, message].filter(Boolean).join('\n\n');
    if (buttons?.some((button) => button.style === 'cancel')) {
      const accepted = globalThis.confirm(text);
      const button = buttons.find((item) => accepted ? item.style !== 'cancel' : item.style === 'cancel');
      button?.onPress?.();
    } else {
      globalThis.alert(text);
      buttons?.[0]?.onPress?.();
    }
  },
};
