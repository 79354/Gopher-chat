import { create } from 'zustand';

// --- Types ---

export interface User {
  userID: string;
  username: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'away';
}

export type OnlineUser = User;

export interface Message {
  id: string;
  tempId?: string;
  toUserID: string;
  fromUserID: string;
  message: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  type: 'text' | 'image' | 'file' | 'system';
}

export interface FriendRequest {
  id: string;
  fromUser: User;
  status: 'pending' | 'accepted' | 'rejected';
}

interface ChatStore {
  // --- Auth & Connection ---
  currentUser: User | null;
  socketStatus: 'connecting' | 'connected' | 'disconnected';

  // --- Social Graph ---
  onlineUsers: User[];
  friends: User[];
  friendRequests: FriendRequest[];

  // --- Chat State ---
  activeChat: User | null;
  messages: Record<string, Message[]>;

  // --- UX Features ---
  typingUsers: Record<string, boolean>; // Map of UserID -> IsTyping

  // --- Actions ---
  setCurrentUser: (user: User | null) => void;
  setSocketStatus: (status: 'connecting' | 'connected' | 'disconnected') => void;
  setOnlineUsers: (users: User[]) => void;
  setFriends: (friends: User[]) => void;
  setActiveChat: (user: User | null) => void;

  // Optimistic UI Actions
  addMessage: (otherUserID: string, message: Message) => void;
  updateMessageStatus: (otherUserID: string, tempId: string, status: Message['status']) => void;
  setMessages: (otherUserID: string, messages: Message[]) => void;

  // Typing Actions
  setTyping: (userID: string, isTyping: boolean) => void;

  clearStore: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  currentUser: null,
  socketStatus: 'disconnected',
  onlineUsers: [],
  friends: [],
  friendRequests: [],
  activeChat: null,
  messages: {},
  typingUsers: {},

  setCurrentUser: (user) => set({ currentUser: user }),
  setSocketStatus: (status) => set({ socketStatus: status }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),
  setFriends: (friends) => set({ friends }),

  setActiveChat: (user) => set({ activeChat: user }),

  addMessage: (otherUserID, message) =>
    set((state) => {
      const existingMessages = state.messages[otherUserID] || [];
      // Upsert Logic
      const index = existingMessages.findIndex(
        (m) =>
          (message.tempId && m.tempId === message.tempId) ||
          (message.id && m.id === message.id)
      );

      if (index > -1) {
        const updated = [...existingMessages];
        updated[index] = { ...updated[index], ...message };
        return { messages: { ...state.messages, [otherUserID]: updated } };
      }

      return { messages: { ...state.messages, [otherUserID]: [...existingMessages, message] } };
    }),

  updateMessageStatus: (otherUserID, tempId, status) =>
    set((state) => {
      const chatMessages = state.messages[otherUserID] || [];
      return {
        messages: {
          ...state.messages,
          [otherUserID]: chatMessages.map((m) =>
            m.tempId === tempId ? { ...m, status } : m
          ),
        },
      };
    }),

  setMessages: (otherUserID, messages) =>
    set((state) => ({ messages: { ...state.messages, [otherUserID]: messages } })),

  setTyping: (userID, isTyping) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [userID]: isTyping },
    })),

  clearStore: () =>
    set({
      currentUser: null,
      socketStatus: 'disconnected',
      onlineUsers: [],
      friends: [],
      friendRequests: [],
      activeChat: null,
      messages: {},
      typingUsers: {},
    }),
}));