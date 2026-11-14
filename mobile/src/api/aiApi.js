import { api } from './config';

export const aiApi = {
  async getSmartPlaylist(vibe) {
    const res = await api.get(`/get-smart-playlist?vibe=${encodeURIComponent(vibe)}`, { timeout: 120000 });
    return res.data; // { success: true, vibe, songs: [...] }
  },

  async getAiEq(song, artist) {
    const res = await api.get(`/get-ai-eq?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist || '')}`);
    return res.data; // { success: true, genre, values: [...] }
  },

  async getAiRecommendations() {
    const res = await api.get('/recommendations', { timeout: 75000 });
    return res.data; // { success: true, aiVibe, total, songs: [...] }
  },

  async askAi(prompt) {
    const res = await api.post('/api/ask-ai', { prompt }, { timeout: 35000 });
    return res.data; // { success: true, answer: ... }
  },
};
