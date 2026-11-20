import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { authApi } from '../api/authApi';
import { unregisterPushDevice, notificationsModule } from '../services/pushNotifications';
import { setApiBaseUrl, getApiBaseUrl, normalizeServerUrl, setApiToken, setUnauthorizedHandler } from '../api/config';
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverUrl, setServerUrlState] = useState(getApiBaseUrl());
  const clearSession = async () => {
    setApiToken(null); setToken(null); setUser(null);
    await storage.clearAuth();
  };
  const logout = async () => {
    try { await unregisterPushDevice(); } catch { /* Server session revocation also disables delivery. */ }
    try { const notifications = await notificationsModule(); await notifications?.dismissAllNotificationsAsync(); } catch {}
    // Clear local state even while offline; online logout also revokes the token.
    try { await authApi.logout(); } catch { /* Offline logout still clears this device. */ }
    await clearSession();
  };
  const updateServerUrl = async (value) => {
    const clean = normalizeServerUrl(value);
    if (clean === serverUrl) return;
    await logout();
    await storage.setServerUrl(clean);
    setApiBaseUrl(clean); setServerUrlState(clean);
  };

  const establishSession = async (data) => {
    if (!data.token || !data.user) throw new Error('Invalid login response');
    await storage.setToken(data.token);
    await storage.setUser(data.user);
    setApiToken(data.token); setToken(data.token); setUser(data.user);
    return data;
  };

  const login = async (email, password) => establishSession(await authApi.login(email, password));

  const signup = async (email, userdata, password, verificationToken) => establishSession(await authApi.signup(email, userdata, password, verificationToken));

  const refreshProfile = async () => {
    try {
      const profile = await authApi.getProfile();
      setUser(profile); await storage.setUser(profile); return profile;
    } catch { return null; }
  };

  useEffect(() => {
    let active = true;
    setUnauthorizedHandler(() => { clearSession().catch(() => {}); });
    (async () => {
      try {
        const savedUrl = await storage.getServerUrl();
        if (savedUrl) { setApiBaseUrl(savedUrl); setServerUrlState(savedUrl); }
        const [savedToken, savedUser] = await Promise.all([storage.getToken(), storage.getUser()]);
        if (!active) return;
        if (savedToken) {
          setApiToken(savedToken); setToken(savedToken); setUser(savedUser);
          try {
            const profile = await authApi.getProfile();
            if (active) { setUser(profile); await storage.setUser(profile); }
          } catch (error) {
            if (error.response?.status === 401) await clearSession();
          }
        }
      } catch { if (active) await clearSession().catch(() => {}); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; setUnauthorizedHandler(null); };
  }, []);

  return <AuthContext.Provider value={{ user, token, loading, serverUrl, isAuthenticated: !!token,
    login, signup, logout, updateServerUrl, refreshProfile }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
