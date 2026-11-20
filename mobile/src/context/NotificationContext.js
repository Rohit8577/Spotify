import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from './AuthContext';
import { usePlayer } from './PlayerContext';
import { notificationsModule, registerPushDevice } from '../services/pushNotifications';

const NotificationContext = createContext(null);
export function NotificationProvider({ children }) {
  const { user, token, loading } = useAuth();
  const { playSong, setIsFullPlayerVisible } = usePlayer();
  const [status, setStatus] = useState('Enable alerts for messages, songs & friends');
  const busy = useRef(false);
  const handled = useRef(null);
  const alive = useRef(true);
  const actions = useRef({ playSong, setIsFullPlayerVisible });
  useEffect(() => { actions.current = { playSong, setIsFullPlayerVisible }; });
  async function enableNotifications(requestPermission = true) {
    if (!token || busy.current) return;
    busy.current = true;
    try {
      const result = await registerPushDevice(requestPermission);
      if (alive.current) setStatus(result);
    } catch { if (alive.current) setStatus('Could not connect. Tap to retry notifications.'); }
    finally { busy.current = false; }
  }
  useEffect(() => {
    alive.current = true;
    if (!token || loading) return;
    let disposed = false;
    const subscriptions = [];
    const handleResponse = (response) => {
      if (disposed || !response) return;
      const { identifier, content } = response.notification.request;
      if (identifier === handled.current) return;
      handled.current = identifier;
      const data = content.data || {};
      if (data.recipientId !== String(user?.id)) return;
      if (data.type === 'chat' && typeof data.friendId === 'string') {
        router.push({ pathname: '/Chat', params: { friendId: data.friendId, friendName: String(data.friendName || 'Friend') } });
      } else if (data.type === 'song' && typeof data.songId === 'string') {
        void actions.current.playSong({ id: data.songId });
        actions.current.setIsFullPlayerVisible(true);
      } else if (data.type === 'friend-request') router.push('/Social');
    };
    void enableNotifications(false);
    notificationsModule().then(async (notifications) => {
      if (!notifications || disposed) return;
      // Foreground socket UI already presents social events; avoid duplicate banners/sounds.
      notifications.setNotificationHandler({ handleNotification: async () => ({
        shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
      }) });
      subscriptions.push(notifications.addNotificationResponseReceivedListener(handleResponse));
      subscriptions.push(notifications.addPushTokenListener(() => { void enableNotifications(false); }));
      handleResponse(await notifications.getLastNotificationResponseAsync());
    }).catch(() => {});
    const appState = AppState.addEventListener('change', (value) => { if (value === 'active') void enableNotifications(false); });
    return () => { disposed = true; alive.current = false; subscriptions.forEach((s) => s.remove()); appState.remove(); };
  }, [token, loading, user?.id]);
  return <NotificationContext.Provider value={{ status, enableNotifications }}>{children}</NotificationContext.Provider>;
}
export const useNotifications = () => useContext(NotificationContext);
