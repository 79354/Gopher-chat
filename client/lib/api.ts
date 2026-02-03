import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthResponse {
  userID: string;
  username: string;
}

export const api = {
  // Auth endpoints
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await axios.post(`${API_BASE_URL}/login`, payload);
    return response.data;
  },

  register: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await axios.post(`${API_BASE_URL}/registration`, payload);
    return response.data;
  },

  // Session check
  checkSession: async (userID: string): Promise<boolean> => {
    try {
      await axios.get(`${API_BASE_URL}/UserSessionCheck/${userID}`);
      return true;
    } catch {
      return false;
    }
  },

  // Chat history
  getConversation: async (toUserID: string, fromUserID: string) => {
    const response = await axios.get(
      `${API_BASE_URL}/getConversation/${toUserID}/${fromUserID}`
    );
    return response.data;
  },
};

// WebSocket URL generator
export const getWebSocketURL = (userID: string): string => {
  return `ws://localhost:8080/ws/${userID}`;
};
