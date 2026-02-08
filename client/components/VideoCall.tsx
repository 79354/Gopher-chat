'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useVideoSocket } from '@/hooks/useVideoSocket';
import VideoControls from './VideoControls';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoCallProps {
    roomId: string;
    userId: string;
    username: string;
    peerId?: string; // For 1-on-1 calls
    isGroup?: boolean;
    onClose: () => void;
}

export default function VideoCall({
    roomId,
    userId,
    username,
    peerId,
    isGroup = false,
    onClose
}: VideoCallProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());

    const {
        localStream,
        remoteStreams,
        isAudioMuted,
        isVideoMuted,
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
        isScreenSharing
    } = useWebRTC(roomId, userId);

    const { connectionStatus, participants } = useVideoSocket(
        roomId,
        userId,
        isGroup
    );

    // Attach local stream to video element
    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Attach remote streams to video elements
    useEffect(() => {
        remoteStreams.forEach((stream, peerId) => {
            const videoElement = remoteVideosRef.current.get(peerId);
            if (videoElement && stream) {
                videoElement.srcObject = stream;
            }
        });
    }, [remoteStreams]);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        // TODO: Implement actual fullscreen API
    };

    const handleEndCall = () => {
        // TODO: Clean up streams and connections
        onClose();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                    "fixed bg-slate-950 rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-50",
                    isFullscreen && "inset-0 rounded-none",
                    isMinimized && "bottom-4 right-4 w-80 h-60",
                    !isFullscreen && !isMinimized && "inset-10"
                )}
            >
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-center">
                    <div>
                        <h3 className="text-white font-semibold">
                            {isGroup ? `Group Call (${participants.length})` : username}
                        </h3>
                        <p className="text-xs text-gray-400">
                            {connectionStatus === 'connected' ? '🟢 Connected' : '🟡 Connecting...'}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                        >
                            {isMinimized ? <Maximize2 size={20} /> : <Minimize2 size={20} />}
                        </button>
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                        >
                            <Maximize2 size={20} />
                        </button>
                        <button
                            onClick={handleEndCall}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Video Grid */}
                <div className={cn(
                    "relative w-full h-full bg-slate-900",
                    isGroup ? "grid grid-cols-2 md:grid-cols-3 gap-2 p-4" : "flex items-center justify-center"
                )}>
                    {/* Remote Videos */}
                    {Array.from(remoteStreams.keys()).map((peerId) => (
                        <div
                            key={peerId}
                            className="relative bg-slate-800 rounded-lg overflow-hidden aspect-video"
                        >
                            <video
                                ref={(el) => {
                                    if (el) remoteVideosRef.current.set(peerId, el);
                                }}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
                                Participant {peerId.slice(0, 4)}
                            </div>
                        </div>
                    ))}

                    {/* Local Video (Picture-in-Picture) */}
                    <div className="absolute bottom-20 right-4 w-48 h-36 bg-slate-800 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover mirror"
                        />
                        <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
                            You
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <VideoControls
                        isAudioMuted={isAudioMuted}
                        isVideoMuted={isVideoMuted}
                        isScreenSharing={isScreenSharing}
                        onToggleAudio={toggleAudio}
                        onToggleVideo={toggleVideo}
                        onStartScreenShare={startScreenShare}
                        onStopScreenShare={stopScreenShare}
                        onEndCall={handleEndCall}
                    />
                </div>
            </motion.div>
        </AnimatePresence>
    );
}