import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/config';

const tokenKey = '@sangeetx_push_token';
export async function notificationsModule() {
  if (Platform.OS === 'web' || Constants.executionEnvironment === 'storeClient') return null;
  return import('expo-notifications');
}
export async function registerPushDevice(requestPermission = false) {
  const notifications = await notificationsModule();
  if (!notifications || !Device.isDevice) return 'Use an installed app on a physical phone';
  if (Platform.OS === 'android') await notifications.setNotificationChannelAsync('social', {
    name: 'Messages, songs & friends', importance: notifications.AndroidImportance.DEFAULT,
    sound: 'default', lightColor: '#00E5FF', vibrationPattern: [0, 200],
  });
  let permission = await notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission && permission.canAskAgain) permission = await notifications.requestPermissionsAsync();
  if (!permission.granted) {
    await unregisterPushDevice();
    return 'Notifications are off. Enable them in phone settings.';
  }
  if (Platform.OS === 'android' && !Constants.expoConfig?.extra?.pushNotificationsConfigured) return 'Firebase setup needs a new app build';
  const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return 'Notification project is not configured';
  const { data: token } = await notifications.getExpoPushTokenAsync({ projectId });
  await api.post('/notifications/devices', { token, platform: Platform.OS });
  await AsyncStorage.setItem(tokenKey, token);
  return 'Messages, songs & friend requests are enabled';
}
export async function unregisterPushDevice() {
  const token = await AsyncStorage.getItem(tokenKey);
  if (token) await api.delete('/notifications/devices', { data: { token } });
  await AsyncStorage.removeItem(tokenKey);
}
