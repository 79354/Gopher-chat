import { useState, useEffect, useRef, useCallback } from 'react';

// --- Interfaces ---

interface UseWebRTCReturn {
    localStream: MediaStream | null;
    remoteStreams: Map<string, MediaStream>;
    isAudioMuted: boolean;
    isVideoMuted: boolean;
    isScreenSharing: boolean;
    toggleAudio: () => void;
    toggleVideo: () => void;
    startScreenShare: () => Promise<void>;
    stopScreenShare: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // TODO: Add TURN servers for production
    ]
};

export function useWebRTC(roomId: string, userId: string): UseWebRTCReturn {
    // --- State ---
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isAudioMuted, setIsAudioMuted] = useState(false);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // --- Refs ---
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const socketRef = useRef<WebSocket | null>(null);
    const screenStream = useRef<MediaStream | null>(null);
    const iceCandidatesQueue = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

    // --- Handler Refs (The Fix for Refresh Loop) ---
    // We store the latest version of these functions in refs so the WebSocket
    // effect doesn't need to depend on them directly.
    const createOfferRef = useRef<(peerId: string) => Promise<RTCSessionDescriptionInit | null>>(async () => null);
    const handleRemoteOfferRef = useRef<(peerId: string, offer: RTCSessionDescriptionInit) => Promise<void>>(async () => { });
    const handleRemoteAnswerRef = useRef<(peerId: string, answer: RTCSessionDescriptionInit) => Promise<void>>(async () => { });
    const handleICECandidateRef = useRef<(peerId: string, candidate: RTCIceCandidateInit) => Promise<void>>(async () => { });

    // --- 1. Initialize Local Stream ---
    useEffect(() => {
        const initializeMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    },
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 30 }
                    }
                });
                setLocalStream(stream);
            } catch (error) {
                console.error('Error accessing media devices:', error);
            }
        };

        initializeMedia();

        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            if (screenStream.current) {
                screenStream.current.getTracks().forEach(track => track.stop());
            }
            peerConnections.current.forEach(pc => pc.close());
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, []);

    // --- 2. Peer Connection Management ---
    const getOrCreatePeerConnection = useCallback((peerId: string): RTCPeerConnection => {
        if (peerConnections.current.has(peerId)) {
            return peerConnections.current.get(peerId)!;
        }

        console.log(`[WebRTC] Creating new PeerConnection for ${peerId}`);
        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Add local stream tracks
        if (localStream) {
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    type: 'ice-candidate',
                    targetId: peerId,
                    candidate: event.candidate
                }));
            }
        };

        // Handle incoming tracks
        pc.ontrack = (event) => {
            console.log(`[WebRTC] Received remote track from ${peerId}`);
            const [remoteStream] = event.streams;
            if (remoteStream) {
                setRemoteStreams(prev => {
                    const newMap = new Map(prev);
                    newMap.set(peerId, remoteStream);
                    return newMap;
                });
            }
        };

        // Handle connection state
        pc.onconnectionstatechange = () => {
            console.log(`[WebRTC] Connection state for ${peerId}: ${pc.connectionState}`);
            if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
                setRemoteStreams(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(peerId);
                    return newMap;
                });
            }
        };

        peerConnections.current.set(peerId, pc);
        return pc;
    }, [localStream]);

    // --- 3. Media Controls ---
    const toggleAudio = useCallback(() => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioMuted(!audioTrack.enabled);
            }
        }
    }, [localStream]);

    const toggleVideo = useCallback(() => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoMuted(!videoTrack.enabled);
            }
        }
    }, [localStream]);

    // --- 4. Screen Sharing ---
    const stopScreenShare = useCallback(() => {
        if (screenStream.current) {
            screenStream.current.getTracks().forEach(track => track.stop());
            screenStream.current = null;
        }

        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            peerConnections.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender && videoTrack) {
                    sender.replaceTrack(videoTrack);
                }
            });
        }
        setIsScreenSharing(false);
    }, [localStream]);

    const startScreenShare = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' } as any,
                audio: false
            });

            screenStream.current = stream;
            const videoTrack = stream.getVideoTracks()[0];

            peerConnections.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });

            videoTrack.onended = () => {
                stopScreenShare();
            };

            setIsScreenSharing(true);
        } catch (error) {
            console.error('Error starting screen share:', error);
        }
    }, [stopScreenShare]);

    // --- 5. Signaling Logic ---

    const createOffer = useCallback(async (peerId: string) => {
        try {
            const pc = getOrCreatePeerConnection(peerId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            return offer;
        } catch (err) {
            console.error("Error creating offer:", err);
            return null;
        }
    }, [getOrCreatePeerConnection]);

    const handleRemoteOffer = useCallback(async (peerId: string, offer: RTCSessionDescriptionInit) => {
        try {
            const pc = getOrCreatePeerConnection(peerId);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            // PROCESS QUEUED CANDIDATES
            const queue = iceCandidatesQueue.current.get(peerId);
            if (queue) {
                console.log(`[WebRTC] Processing ${queue.length} queued candidates for ${peerId}`);
                for (const candidate of queue) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
                iceCandidatesQueue.current.delete(peerId);
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                socketRef.current.send(JSON.stringify({
                    type: 'answer',
                    targetId: peerId,
                    sdp: answer
                }));
            }
        } catch (err) {
            console.error("Error handling remote offer:", err);
        }
    }, [getOrCreatePeerConnection]);

    const handleRemoteAnswer = useCallback(async (peerId: string, answer: RTCSessionDescriptionInit) => {
        const pc = peerConnections.current.get(peerId);
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }, []);

    const handleICECandidate = useCallback(async (peerId: string, candidate: RTCIceCandidateInit) => {
        const pc = peerConnections.current.get(peerId);
        if (pc && pc.remoteDescription) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error("Error adding ICE candidate", e);
            }
        } else {
            console.warn(`[WebRTC] Queueing ICE candidate for ${peerId} (PC not ready)`);
            if (!iceCandidatesQueue.current.has(peerId)) {
                iceCandidatesQueue.current.set(peerId, []);
            }
            iceCandidatesQueue.current.get(peerId)?.push(candidate);
        }
    }, []);

    // --- 6. REF SYNCHRONIZATION (The Logic Fix) ---
    // Keep the refs in sync with the latest functions
    useEffect(() => {
        createOfferRef.current = createOffer;
        handleRemoteOfferRef.current = handleRemoteOffer;
        handleRemoteAnswerRef.current = handleRemoteAnswer;
        handleICECandidateRef.current = handleICECandidate;
    }, [createOffer, handleRemoteOffer, handleRemoteAnswer, handleICECandidate]);

    // --- 7. WebSocket Connection (The Connection Fix) ---
    useEffect(() => {
        if (!userId || !roomId) return;

        const wsUrl = `${process.env.NEXT_PUBLIC_VIDEO_WS_URL || 'ws://localhost:4000'}/ws/${roomId}?userId=${userId}`;
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => console.log("Connected to Video WS");

        ws.onmessage = async (event) => {
            try {
                const msg = JSON.parse(event.data);
                switch (msg.type) {
                    case 'user-joined':
                        console.log("User joined:", msg.userId);
                        // Call via ref to avoid stale closure or dependency loop
                        const offer = await createOfferRef.current(msg.userId);
                        if (offer && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'offer', targetId: msg.userId, sdp: offer }));
                        }
                        break;
                    case 'offer':
                        await handleRemoteOfferRef.current(msg.userId, msg.sdp);
                        break;
                    case 'answer':
                        await handleRemoteAnswerRef.current(msg.userId, msg.sdp);
                        break;
                    case 'ice-candidate':
                        await handleICECandidateRef.current(msg.userId, msg.candidate);
                        break;
                    default:
                        break;
                }
            } catch (err) {
                console.error("Error handling WS message:", err);
            }
        };

        return () => {
            console.log("Cleaning up WebSocket...");
            ws.close();
        };
        // CRITICAL: Only [roomId, userId] in dependency array.
        // Changing streams or handlers will NO LONGER reset the connection.
    }, [roomId, userId]);

    return {
        localStream,
        remoteStreams,
        isAudioMuted,
        isVideoMuted,
        isScreenSharing,
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare
    };
}