import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthResponse {
  userID: string;
  username: string;
}

export const api = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, payload);
    return response.data.response; // UNWRAP HERE
  },

  register: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/register`, payload);
    return response.data.response; // UNWRAP HERE
  },

  checkSession: async (userID: string): Promise<boolean> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/user/session/${userID}`);
      // Check the actual boolean in the response body
      return response.data.response === true;
    } catch {
      return false;
    }
  },

  getConversation: async (toUserID: string, fromUserID: string) => {
    const response = await axios.get(
      `${API_BASE_URL}/api/messages/conversation/${toUserID}/${fromUserID}`
    );
    return response.data.response; // UNWRAP HERE
  },

  sendFriendRequest: async (targetUsername: string): Promise<boolean> => {
    const response = await axios.post(
      `${API_BASE_URL}/api/friends/request/${targetUsername}`
    );
    return response.data.response === true;
  },

  acceptFriendRequest: async (requesterID: string): Promise<boolean> => {
    const response = await axios.post(
      `${API_BASE_URL}/api/friends/accept/${requesterID}`
    );
    return response.data.response === true;
  },

  getFriends: async () => {
    const response = await axios.get(
      `${API_BASE_URL}/api/friends/list`
    );
    return response.data.response;
  },
};

export const getWebSocketURL = (userID: string): string => {
  return `ws://localhost:8080/ws/${userID}`;
};
