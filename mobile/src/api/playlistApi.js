import { api } from './config';

export const playlistApi = {
  async getLibrary() {
    const res = await api.get('/fetchplaylist');
    return res.data; // { array: [...] }
  },

  async createPlaylist(name, imageUrl = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4') {
    const res = await api.post('/playlistname', { name, imageUrl });
    return res.data;
  },

  async getPlaylistSongs(pname) {
    const res = await api.post('/librarySongs', { pname });
    return res.data; // { arr: [...] }
  },

  async addSongToPlaylist({ playlistName, song }) {
    const res = await api.post('/songinfo', {
      name: song.name || song.title || song.songName,
      url: song.image || song.imageUrl,
      songUrl: song.url || song.songUrl || song.audio_url,
      artist: song.artist || song.artistName || 'Unknown Artist',
      pname: playlistName,
      time: song.duration || song.len || 0,
      songId: song.id || song.songId,
    });
    return res.data;
  },

  async removeSongFromPlaylist(playlistName, songId) {
    const res = await api.post('/deleteSong', { playlistName, songId });
    return res.data;
  },

  async renamePlaylist(oldName, newName) {
    const res = await api.post('/renamePlaylist', { oldName, newName });
    return res.data;
  },

  async deletePlaylist(playlistName) {
    const res = await api.post('/deletePlaylist', { playlistName });
    return res.data;
  },
};
