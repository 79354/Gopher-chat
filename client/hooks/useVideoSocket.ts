import { useState, useEffect, useRef, useCallback } from 'react';

interface Participant {
    userId: string;
    username?: string;
    joinedAt: number;
}

interface SignalMessage {
    type: string;
    userId: string;
    targetId?: string;
    roomId: string;
    sdp?: RTCSessionDescriptionInit;
    ice?: RTCIceCandidateInit;
}

interface UseVideoSocketReturn {
    connectionStatus: 'connecting' | 'connected' | 'disconnected';
    participants: Participant[];
    sendOffer: (targetId: string, offer: RTCSessionDescriptionInit) => void;
    sendAnswer: (targetId: string, answer: RTCSessionDescriptionInit) => void;
    sendICECandidate: (targetId: string, candidate: RTCIceCandidateInit) => void;
}

const VIDEO_WS_URL = process.env.NEXT_PUBLIC_VIDEO_WS_URL || 'ws://localhost:4000';

export function useVideoSocket(
    roomId: string,
    userId: string,
    isGroup: boolean,
    onOffer?: (peerId: string, offer: RTCSessionDescriptionInit) => void,
    onAnswer?: (peerId: string, answer: RTCSessionDescriptionInit) => void,
    onICECandidate?: (peerId: string, candidate: RTCIceCandidateInit) => void,
    onNewPeer?: (peerId: string) => void // New callback for initiating connections
): UseVideoSocketReturn {
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const [participants, setParticipants] = useState<Participant[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        setConnectionStatus('connecting');
        const ws = new WebSocket(`${VIDEO_WS_URL}/ws/${roomId}?userId=${userId}`);

        ws.onopen = () => {
            console.log('Video WebSocket connected');
            setConnectionStatus('connected');

            // Request offers from existing peers if this is a group call
            // This tells existing participants "I am new, please call me"
            if (isGroup) {
                ws.send(JSON.stringify({
                    type: 'request-offer',
                    userId,
                    roomId
                }));
            }
        };

        ws.onmessage = (event) => {
            try {
                const message: SignalMessage = JSON.parse(event.data);
                handleSignalMessage(message);
            } catch (error) {
                console.error('Error parsing video signal message:', error);
            }
        };

        ws.onclose = () => {
            console.log('Video WebSocket disconnected');
            setConnectionStatus('disconnected');
            wsRef.current = null;

            // Attempt reconnection
            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, 3000);
        };

        ws.onerror = (error) => {
            console.error('Video WebSocket error:', error);
        };

        wsRef.current = ws;
    }, [roomId, userId, isGroup]);

    const handleSignalMessage = useCallback((message: SignalMessage) => {
        // Ignore messages sent by ourselves
        if (message.userId === userId) return;

        switch (message.type) {
            case 'user-joined':
                // Update participants list UI
                setParticipants(prev => {
                    if (prev.some(p => p.userId === message.userId)) return prev;
                    return [...prev, { userId: message.userId, joinedAt: Date.now() }];
                });
                console.log('User joined:', message.userId);
                break;

            case 'user-left':
                // Remove from participants list UI
                setParticipants(prev => prev.filter(p => p.userId !== message.userId));
                console.log('User left:', message.userId);
                break;

            case 'offer':
                // Received an offer from a peer -> Trigger onOffer to create Answer
                if (message.sdp && onOffer) {
                    onOffer(message.userId, message.sdp);
                }
                break;

            case 'answer':
                // Received an answer from a peer -> Trigger onAnswer to set Remote Description
                if (message.sdp && onAnswer) {
                    onAnswer(message.userId, message.sdp);
                }
                break;

            case 'ice-candidate':
                // Received an ICE candidate from a peer -> Trigger onICECandidate to add candidate
                if (message.ice && onICECandidate) {
                    onICECandidate(message.userId, message.ice);
                }
                break;

            case 'new-peer':
                // Server telling us a new peer joined and wants US to initiate the connection.
                // Trigger onNewPeer to create Offer
                if (onNewPeer && message.userId) {
                    console.log('New peer joined, initiating connection to:', message.userId);
                    onNewPeer(message.userId);
                } else if (message.targetId === userId && onNewPeer) {
                    // Alternate payload format: "userId" is the sender (the new peer)
                    console.log('New peer joined (target matched), initiating connection to:', message.userId);
                    onNewPeer(message.userId);
                }
                break;

            default:
                console.log('Unknown signal message type:', message.type);
        }
    }, [userId, onOffer, onAnswer, onICECandidate, onNewPeer]);

    // Send offer to a specific peer
    const sendOffer = useCallback((targetId: string, offer: RTCSessionDescriptionInit) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'offer',
                userId,
                targetId,
                roomId,
                sdp: offer
            }));
        }
    }, [userId, roomId]);

    // Send answer to a specific peer
    const sendAnswer = useCallback((targetId: string, answer: RTCSessionDescriptionInit) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'answer',
                userId,
                targetId,
                roomId,
                sdp: answer
            }));
        }
    }, [userId, roomId]);

    // Send ICE candidate to a specific peer
    const sendICECandidate = useCallback((targetId: string, candidate: RTCIceCandidateInit) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'ice-candidate',
                userId,
                targetId,
                roomId,
                ice: candidate
            }));
        }
    }, [userId, roomId]);

    // Connect on mount
    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    return {
        connectionStatus,
        participants,
        sendOffer,
        sendAnswer,
        sendICECandidate
    };
}