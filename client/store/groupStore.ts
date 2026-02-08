import { create } from 'zustand';

export interface GroupMember {
    userId: string;
    username: string;
    role: 'admin' | 'member';
    avatar?: string;
    joinedAt: number;
}

export interface Group {
    groupId: string;
    name: string;
    description: string;
    avatar?: string;
    creatorId: string;
    members: GroupMember[];
    memberCount: number;
    createdAt: number;
}

export interface GroupMessage {
    id: string;
    groupId: string;
    fromUserId: string;
    fromUsername: string;
    message: string;
    timestamp: number;
    type: 'text' | 'image' | 'file' | 'system';
    status?: 'sending' | 'sent' | 'failed';
}

export interface ActiveVideoCall {
    roomId: string;
    groupId: string;
    callerId: string;
    participants: string[];
    startedAt: number;
}

interface GroupStore {
    // Groups
    groups: Group[];
    activeGroup: Group | null;

    // Messages
    groupMessages: Record<string, GroupMessage[]>; // groupId -> messages[]

    // Video Calls
    activeVideoCalls: Record<string, ActiveVideoCall>; // groupId -> call info

    // Actions
    setGroups: (groups: Group[]) => void;
    addGroup: (group: Group) => void;
    updateGroup: (groupId: string, updates: Partial<Group>) => void;
    removeGroup: (groupId: string) => void;
    setActiveGroup: (group: Group | null) => void;

    // Message Actions
    addGroupMessage: (groupId: string, message: GroupMessage) => void;
    setGroupMessages: (groupId: string, messages: GroupMessage[]) => void;
    updateMessageStatus: (groupId: string, messageId: string, status: 'sending' | 'sent' | 'failed') => void;

    // Video Call Actions
    startVideoCall: (groupId: string, call: ActiveVideoCall) => void;
    endVideoCall: (groupId: string) => void;
    updateCallParticipants: (groupId: string, participants: string[]) => void;

    // Utility
    clearStore: () => void;
}

export const useGroupStore = create<GroupStore>((set) => ({
    groups: [],
    activeGroup: null,
    groupMessages: {},
    activeVideoCalls: {},

    // Group Management
    setGroups: (groups) => set({ groups }),

    addGroup: (group) =>
        set((state) => ({
            groups: [...state.groups, group]
        })),

    updateGroup: (groupId, updates) =>
        set((state) => ({
            groups: state.groups.map((g) =>
                g.groupId === groupId ? { ...g, ...updates } : g
            )
        })),

    removeGroup: (groupId) =>
        set((state) => ({
            groups: state.groups.filter((g) => g.groupId !== groupId),
            activeGroup: state.activeGroup?.groupId === groupId ? null : state.activeGroup
        })),

    setActiveGroup: (group) => set({ activeGroup: group }),

    // Message Management
    addGroupMessage: (groupId, message) =>
        set((state) => {
            const existingMessages = state.groupMessages[groupId] || [];

            // Check for duplicate (by tempId or id)
            const isDuplicate = existingMessages.some(
                (m) => m.id === message.id || (message.id && m.id === message.id)
            );

            if (isDuplicate) {
                // Update existing message
                return {
                    groupMessages: {
                        ...state.groupMessages,
                        [groupId]: existingMessages.map((m) =>
                            m.id === message.id ? { ...m, ...message } : m
                        )
                    }
                };
            }

            // Add new message
            return {
                groupMessages: {
                    ...state.groupMessages,
                    [groupId]: [...existingMessages, message]
                }
            };
        }),

    setGroupMessages: (groupId, messages) =>
        set((state) => ({
            groupMessages: {
                ...state.groupMessages,
                [groupId]: messages
            }
        })),

    updateMessageStatus: (groupId, messageId, status) =>
        set((state) => ({
            groupMessages: {
                ...state.groupMessages,
                [groupId]: (state.groupMessages[groupId] || []).map((m) =>
                    m.id === messageId ? { ...m, status } : m
                )
            }
        })),

    // Video Call Management
    startVideoCall: (groupId, call) =>
        set((state) => ({
            activeVideoCalls: {
                ...state.activeVideoCalls,
                [groupId]: call
            }
        })),

    endVideoCall: (groupId) =>
        set((state) => {
            const { [groupId]: _, ...rest } = state.activeVideoCalls;
            return { activeVideoCalls: rest };
        }),

    updateCallParticipants: (groupId, participants) =>
        set((state) => ({
            activeVideoCalls: {
                ...state.activeVideoCalls,
                [groupId]: {
                    ...state.activeVideoCalls[groupId],
                    participants
                }
            }
        })),

    // Utility
    clearStore: () =>
        set({
            groups: [],
            activeGroup: null,
            groupMessages: {},
            activeVideoCalls: {}
        })
}));