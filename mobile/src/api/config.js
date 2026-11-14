import axios from 'axios';
export const DEFAULT_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://sangeetx.online';
let currentBaseUrl = DEFAULT_BASE_URL;
let currentToken = null;
let onUnauthorized = null;
export const api = axios.create({ baseURL: currentBaseUrl, timeout: 15000, headers: { 'Content-Type': 'application/json' } });
export function normalizeServerUrl(value) {
  const parsed = new URL(value.trim());
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('Enter a valid http:// or https:// server address.');
  return parsed.toString().replace(/\/$/, '');
}
export const setApiBaseUrl = (value) => { currentBaseUrl = normalizeServerUrl(value); api.defaults.baseURL = currentBaseUrl; };
export const getApiBaseUrl = () => currentBaseUrl;
export const setApiToken = (token) => { currentToken = token; };
export const setUnauthorizedHandler = (handler) => { onUnauthorized = handler; };
api.interceptors.request.use((config) => {
  if (currentToken) config.headers.Authorization = 'Bearer ' + currentToken;
  return config;
});
api.interceptors.response.use((response) => response, (error) => {
  const sentToken = error.config?.headers?.Authorization;
  if (error.response?.status === 401 && currentToken && sentToken === 'Bearer ' + currentToken) {
    currentToken = null; onUnauthorized?.();
  }
  return Promise.reject(error);
});
