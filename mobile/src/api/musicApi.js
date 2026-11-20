import { api, getApiBaseUrl } from './config';

export const musicApi = {
  async getHomeModules() {
    const res = await api.get('/search?type=home&query=a');
    return res.data;
  },

  async search({ query, type = 'song' }) {
    const res = await api.get(`/search?type=${encodeURIComponent(type)}&query=${encodeURIComponent(query)}`);
    return res.data;
  },

  async getSongDetails(songId) {
    const res = await api.get(`/search?type=songID&query=${encodeURIComponent(songId)}`);
    return res.data;
  },

  async prepareYouTubeAudio({ videoIds, selectedVideoId }) {
    const res = await api.post('/youtube/resolve', { videoIds, selectedVideoId }, { timeout: 45000 });
    const base = new URL(getApiBaseUrl() + '/');
    return (res.data.sources || []).map((source) => {
      const url = new URL(source.url, base);
      if (url.origin !== base.origin) throw new Error('Invalid audio response.');
      return { ...source, url: url.toString() };
    });
  },

  async getArtistDetails(artistId) {
    const res = await api.get(`/search?type=artistID&query=${encodeURIComponent(artistId)}`);
    return res.data;
  },

  async getAlbumDetails(albumId) {
    const res = await api.get(`/search?type=albumID&query=${encodeURIComponent(albumId)}`);
    return res.data;
  },

  async getPlaylistDetails(playlistId) {
    const res = await api.get(`/search?type=playlistID&query=${encodeURIComponent(playlistId)}`);
    return res.data;
  },

  async getSongRecommendations(songId) {
    const res = await api.get(`/search?type=recomended&query=${encodeURIComponent(songId)}`);
    return res.data;
  },

  async getLyrics(songId) {
    const res = await api.get(`/search?type=lyrics&query=${encodeURIComponent(songId)}`);
    return res.data;
  },

  async getFavorites() {
    const res = await api.get('/get-favorite');
    return res.data; // { arr: [...] }
  },

  async toggleFavorite({ songId, url, image, name, artist, len }) {
    const res = await api.post('/favorite', {
      songId,
      url,
      image,
      name,
      artist,
      len,
    });
    return res.data; // msg: "Added To Liked" or "Remove From Liked"
  },

  async getRecentlyPlayed() {
    const res = await api.get('/updateRecently');
    return res.data; // { arr: [...] }
  },

  async updateRecently({ songId, songUrl, image, songName, artist, len }) {
    const res = await api.post('/updateRecently', {
      songId,
      songUrl,
      image,
      songName,
      artist,
      len,
    });
    return res.data;
  },

  async logInteraction({ type, source = 'mobile', song }) {
    try {
      const res = await api.post('/log-interaction', {
        type,
        source,
        song: {
          songName: song.name || song.songName || song.title,
          songId: song.id || song.songId,
          artist: song.artist || song.artistName,
        },
      });
      return res.data;
    } catch (e) {
      // non-blocking
      return null;
    }
  },

  async addArtist(artistId) {
    const res = await api.post('/addArtist', { id: artistId });
    return res.data;
  },
  async removeArtist(artistId) {
    const res = await api.post('/removeArtist', { id: artistId });
    return res.data;
  },
};
