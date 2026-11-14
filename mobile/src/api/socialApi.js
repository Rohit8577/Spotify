import { api } from './config';

export const socialApi = {
  async getRequests() { return (await api.get('/friends/requests')).data; },
  async respondToRequest(friendId, accept) { return (await api.post('/friends/respond', { friendId, accept })).data; },
  async getFriends() {
    const res = await api.get('/friends/list');
    return res.data;
  },

  async getFriendsActivity() {
    const res = await api.get('/friends/activity');
    return res.data;
  },

  async searchFriends(query) {
    const res = await api.post('/searchFriend', { friendId: query });
    return res.data;
  },

  async sendFriendRequest(friendEmail) {
    const res = await api.post('/sendFriendRequest', { friendId: friendEmail });
    return res.data;
  },

  async getChatHistory(friendId) {
    const res = await api.get(`/chat/history/${encodeURIComponent(friendId)}`);
    return res.data;
  },
};
