import { create } from 'zustand';

// --- Types ---

export interface User {
  userID: string;
  username: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'away';
}

// Retaining OnlineUser as a type alias for compatibility with existing imports
export type OnlineUser = User;

export interface Message {
  id: string;          // Real DB ID or temporary ID
  tempId?: string;     // For optimistic updates
  toUserID: string;
  fromUserID: string;
  message: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  type: 'text' | 'image' | 'file' | 'system'; // Added for Goal 1
}

export interface FriendRequest {
  id: string;
  fromUser: User;
  status: 'pending' | 'accepted' | 'rejected';
}

interface ChatStore {
  // --- Auth & Connection ---
  currentUser: User | null;
  socketStatus: 'connecting' | 'connected' | 'disconnected'; // For Goal 3 (Reliability)

  // --- Social Graph ---
  onlineUsers: User[];
  friends: User[];
  friendRequests: FriendRequest[];

  // --- Chat State ---
  activeChat: User | null;
  messages: Record<string, Message[]>; // key: userID

  // --- UX Features ---
  typingUsers: Record<string, boolean>; // key: userID, value: isTyping

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

      // Upsert Logic: Check if message exists by tempId OR real ID
      const index = existingMessages.findIndex(
        (m) =>
          (message.tempId && m.tempId === message.tempId) ||
          (message.id && m.id === message.id)
      );

      if (index > -1) {
        // UPDATE existing message (e.g., status change 'sending' -> 'sent')
        const updated = [...existingMessages];
        updated[index] = { ...updated[index], ...message };
        return {
          messages: {
            ...state.messages,
            [otherUserID]: updated,
          },
        };
      }

      // INSERT new message
      return {
        messages: {
          ...state.messages,
          [otherUserID]: [...existingMessages, message],
        },
      };
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
    set((state) => ({
      messages: {
        ...state.messages,
        [otherUserID]: messages,
      },
    })),

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