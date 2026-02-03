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
  toUserID: string;
  fromUserID: string;
  message: string;
  timestamp?: number;
}

interface ChatStore {
  currentUser: User | null;
  onlineUsers: OnlineUser[];
  activeChat: OnlineUser | null;
  messages: Record<string, Message[]>; // key: otherUserID, value: messages
  
  setCurrentUser: (user: User | null) => void;
  setOnlineUsers: (users: OnlineUser[]) => void;
  setActiveChat: (user: OnlineUser | null) => void;
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
    set((state) => ({
      messages: {
        ...state.messages,
        [otherUserID]: [...(state.messages[otherUserID] || []), message],
      },
    })),
  
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
