import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface CreateGroupPayload {
    name: string;
    description: string;
    avatar: string;
    creatorID: string;
    memberIDs?: string[];
}

export interface GroupResponse {
    groupID: string;
    name: string;
    description: string;
    avatar: string;
    creatorID: string;
    memberCount: number;
    createdAt: string;
}

export interface GroupDetails {
    id: string;
    name: string;
    description: string;
    avatar: string;
    creatorID: string;
    members: GroupMember[];
    settings: GroupSettings;
    createdAt: string;
    updatedAt: string;
}

export interface GroupMember {
    userID: string;
    username: string;
    role: 'admin' | 'member';
    joinedAt: string;
}

export interface GroupSettings {
    isPublic: boolean;
    allowInvites: boolean;
    messagesCanDelete: boolean;
}

export interface GroupMessage {
    id: string;
    groupID: string;
    fromUserID: string;
    message: string;
    type: 'text' | 'image' | 'file';
    createdAt: string;
}

export const groupApi = {
    /**
     * Create a new group
     */
    createGroup: async (payload: CreateGroupPayload): Promise<GroupResponse> => {
        const response = await axios.post(`${API_BASE_URL}/api/groups/create`, payload);
        return response.data.response;
    },

    /**
     * Get all groups for a user
     */
    getUserGroups: async (userID: string): Promise<GroupResponse[]> => {
        const response = await axios.get(`${API_BASE_URL}/api/groups/user/${userID}`);
        return response.data.response || [];
    },

    /**
     * Get detailed group information
     */
    getGroupDetails: async (groupID: string): Promise<GroupDetails> => {
        const response = await axios.get(`${API_BASE_URL}/api/groups/${groupID}`);
        return response.data.response;
    },

    /**
     * Add a member to a group
     */
    addGroupMember: async (groupID: string, userID: string): Promise<boolean> => {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/groups/members/add`, {
                groupID,
                userID
            });
            return response.status === 200;
        } catch (error) {
            console.error('Error adding group member:', error);
            return false;
        }
    },

    /**
     * Remove a member from a group
     */
    removeGroupMember: async (groupID: string, userID: string): Promise<boolean> => {
        try {
            const response = await axios.delete(
                `${API_BASE_URL}/api/groups/${groupID}/members/${userID}`
            );
            return response.status === 200;
        } catch (error) {
            console.error('Error removing group member:', error);
            return false;
        }
    },

    /**
     * Update group settings
     */
    updateGroup: async (
        groupID: string,
        updates: { name?: string; description?: string; avatar?: string }
    ): Promise<boolean> => {
        try {
            const response = await axios.put(`${API_BASE_URL}/api/groups/update`, {
                groupID,
                ...updates
            });
            return response.status === 200;
        } catch (error) {
            console.error('Error updating group:', error);
            return false;
        }
    },

    /**
     * Delete a group
     */
    deleteGroup: async (groupID: string, requesterID: string): Promise<boolean> => {
        try {
            const response = await axios.delete(
                `${API_BASE_URL}/api/groups/${groupID}?requesterID=${requesterID}`
            );
            return response.status === 200;
        } catch (error) {
            console.error('Error deleting group:', error);
            return false;
        }
    },

    /**
     * Get message history for a group
     */
    getGroupMessages: async (groupID: string, page: number = 1): Promise<GroupMessage[]> => {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/groups/${groupID}/messages?page=${page}`
            );
            return response.data.response || [];
        } catch (error) {
            console.error('Error fetching group messages:', error);
            return [];
        }
    },

    /**
     * Send a message to a group
     */
    sendGroupMessage: async (
        groupID: string,
        fromUserID: string,
        message: string,
        type: 'text' | 'image' | 'file' = 'text'
    ): Promise<string | null> => {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/groups/messages/send`, {
                groupID,
                fromUserID,
                message,
                type
            });
            return response.data.response?.messageId || null;
        } catch (error) {
            console.error('Error sending group message:', error);
            return null;
        }
    },

    /**
     * Start a video call in a group
     */
    startGroupVideoCall: async (groupID: string, callerID: string): Promise<{
        roomId: string;
        groupId: string;
    } | null> => {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/groups/video-call/start`, {
                groupID,
                callerID
            });
            return response.data.response;
        } catch (error) {
            console.error('Error starting group video call:', error);
            return null;
        }
    }
};