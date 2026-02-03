import axios from 'axios';

const API_BASE = 'http://localhost:8080';

export const messagesApi = {
  async getConversation(toUserId, fromUserId, page = 1) {
    const res = await axios.get(`${API_BASE}/getConversation/${toUserId}/${fromUserId}?page=${page}`);
    return res.data;
  }
};