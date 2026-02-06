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
  // AUTH ENDPOINTS

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, payload);
    return response.data.response;
  },

  register: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/register`, payload);
    return response.data.response;
  },

  checkSession: async (userID: string): Promise<boolean> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/user/session/${userID}`);
      return response.data.response === true;
    } catch {
      return false;
    }
  },

  // MESSAGE ENDPOINTS

  getConversation: async (toUserID: string, fromUserID: string) => {
    // FIXED: Always include ?page=1 to prevent server crash
    const response = await axios.get(
      `${API_BASE_URL}/api/messages/conversation/${toUserID}/${fromUserID}?page=1`
    );
    return response.data.response;
  },

  // FRIEND SYSTEM ENDPOINTS

  /**
   * Check if a username exists in the system
   * Returns true if user exists, false otherwise
   */
  checkUsername: async (username: string): Promise<boolean> => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/auth/check-username/${username}`
      );
      // If isUsernameAvailable is false, the user exists
      return response.data.response.isUsernameAvailable === false;
    } catch {
      return false;
    }
  },

  /**
   * Send a friend request to another user
   * @param targetUsername - The username to send request to
   * @returns true if successful, false otherwise
   */
  sendFriendRequest: async (targetUsername: string): Promise<boolean> => {
    const fromUserID = localStorage.getItem('userID');
    if (!fromUserID) {
      console.error('No userID found in localStorage');
      return false;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/friends/request/${fromUserID}`,
        { targetUsername }
      );
      return response.status === 200;
    } catch (error) {
      console.error('Error sending friend request:', error);
      return false;
    }
  },

  /**
   * Accept a friend request from another user
   * @param requesterID - The ID of the user who sent the request
   * @returns true if successful, false otherwise
   */
  acceptFriendRequest: async (requesterID: string): Promise<boolean> => {
    const myUserID = localStorage.getItem('userID');
    if (!myUserID) {
      console.error('No userID found in localStorage');
      return false;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/friends/accept/${requesterID}/${myUserID}`
      );
      return response.status === 200;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return false;
    }
  },

  /**
   * Get the current user's friends list
   * @param userID - The current user's ID
   * @returns Array of friends or empty array
   */
  getFriends: async (userID: string) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/friends/list/${userID}`
      );
      return response.data.response || [];
    } catch (error) {
      console.error('Error fetching friends:', error);
      return [];
    }
  },

  /**
   * Get pending friend requests for the current user
   * @param userID - The current user's ID
   * @returns Array of pending requests or empty array
   */
  getPendingRequests: async (userID: string) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/friends/requests/${userID}`
      );
      return response.data.response || [];
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return [];
    }
  },
};

/**
 * Generate WebSocket URL for a specific user
 * @param userID - The user's ID
 * @returns WebSocket URL string
 */
export const getWebSocketURL = (userID: string): string => {
  const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
  return `${WS_BASE_URL}/ws/${userID}`;
};