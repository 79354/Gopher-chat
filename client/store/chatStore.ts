import { create } from 'zustand';

export interface User {
  userID: string;
  username: string;
}

export interface OnlineUser {
  userID: string;
  username: string;
}

export interface Message {
  id?: string;          // Real DB ID from server
  tempId?: string;      // Temporary ID for optimistic updates
  toUserID: string;
  fromUserID: string;
  message: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

interface ChatStore {
  currentUser: User | null;
  onlineUsers: OnlineUser[];
  activeChat: OnlineUser | null;
  messages: Record<string, Message[]>; // key: otherUserID, value: messages

  setCurrentUser: (user: User | null) => void;
  setOnlineUsers: (users: OnlineUser[]) => void;
  setActiveChat: (user: OnlineUser | null) => void;

  // Updated to handle upserts (add or update)
  addMessage: (otherUserID: string, message: Message) => void;

  setMessages: (otherUserID: string, messages: Message[]) => void;
  clearStore: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  currentUser: null,
  onlineUsers: [],
  activeChat: null,
  messages: {},

  setCurrentUser: (user) => set({ currentUser: user }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  setActiveChat: (user) => set({ activeChat: user }),

  addMessage: (otherUserID, message) =>
    set((state) => {
      const existingMessages = state.messages[otherUserID] || [];

      // Check if message already exists (by tempId or real ID)
      const messageIndex = existingMessages.findIndex(
        (m) =>
          (message.tempId && m.tempId === message.tempId) ||
          (message.id && m.id === message.id)
      );

      if (messageIndex > -1) {
        // UPDATE existing message (e.g., status change 'sending' -> 'sent')
        const updatedMessages = [...existingMessages];
        updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], ...message };

        return {
          messages: {
            ...state.messages,
            [otherUserID]: updatedMessages,
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

  setMessages: (otherUserID, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [otherUserID]: messages,
      },
    })),

  clearStore: () =>
    set({
      currentUser: null,
      onlineUsers: [],
      activeChat: null,
      messages: {},
    }),
}));