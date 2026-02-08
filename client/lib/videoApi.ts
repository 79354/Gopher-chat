import axios from 'axios';

const VIDEO_API_URL = process.env.NEXT_PUBLIC_VIDEO_API_URL || 'http://localhost:4000/api';

export interface CreateRoomRequest {
    roomId?: string;
    creatorId: string;
    groupId?: string;
    type: 'peer' | 'group';
}

export interface RoomParticipant {
    userId: string;
    username: string;
    joinedAt: number;
    audioMuted: boolean;
    videoMuted: boolean;
    isScreening: boolean;
}

export interface RoomInfo {
    roomId: string;
    creatorId: string;
    groupId?: string;
    type: 'peer' | 'group';
    createdAt: number;
    participants: RoomParticipant[];
    isActive: boolean;
}

export const videoApi = {
    /**
     * Create a new video call room
     */
    createRoom: async (payload: CreateRoomRequest): Promise<{ roomId: string; creatorId: string }> => {
        try {
            const response = await axios.post(`${VIDEO_API_URL}/rooms/create`, payload);
            return response.data;
        } catch (error) {
            console.error('Error creating video room:', error);
            throw error;
        }
    },

    /**
     * Get participants in a room
     */
    getRoomParticipants: async (roomId: string): Promise<RoomParticipant[]> => {
        try {
            const response = await axios.get(`${VIDEO_API_URL}/rooms/${roomId}/participants`);
            return response.data.participants || [];
        } catch (error) {
            console.error('Error fetching room participants:', error);
            return [];
        }
    },

    /**
     * Delete a video call room
     */
    deleteRoom: async (roomId: string): Promise<boolean> => {
        try {
            const response = await axios.delete(`${VIDEO_API_URL}/rooms/${roomId}`);
            return response.data.deleted === true;
        } catch (error) {
            console.error('Error deleting room:', error);
            return false;
        }
    },

    /**
     * Check video service health
     */
    checkHealth: async (): Promise<boolean> => {
        try {
            const response = await axios.get(`${VIDEO_API_URL.replace('/api', '')}/health`);
            return response.data.status === 'healthy';
        } catch (error) {
            console.error('Video service is down:', error);
            return false;
        }
    }
};

/**
 * Generate WebSocket URL for video signaling
 */
export const getVideoWebSocketURL = (roomId: string, userId: string): string => {
    const WS_BASE_URL = process.env.NEXT_PUBLIC_VIDEO_WS_URL || 'ws://localhost:4000';
    return `${WS_BASE_URL}/ws/${roomId}?userId=${userId}`;
};