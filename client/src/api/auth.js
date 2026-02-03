import axios from 'axios';

const API_BASE = 'http://localhost:8080';

export const authApi = {
  async checkUsername(username) {
    const res = await axios.get(`${API_BASE}/isUsernameAvailable/${username}`);
    return res.data;
  },
  async login({ username, password }) {
    const res = await axios.post(`${API_BASE}/login`, { username, password });
    return res.data;
  },
  async register({ username, password }) {
    const res = await axios.post(`${API_BASE}/registration`, { username, password });
    return res.data;
  },
  async checkSession(userId) {
    const res = await axios.get(`${API_BASE}/UserSessionCheck/${userId}`);
    return res.data;
  }
};