'use client';

import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoControlsProps {
    isAudioMuted: boolean;
    isVideoMuted: boolean;
    isScreenSharing: boolean;
    onToggleAudio: () => void;
    onToggleVideo: () => void;
    onStartScreenShare: () => void;
    onStopScreenShare: () => void;
    onEndCall: () => void;
}

export default function VideoControls({
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    onToggleAudio,
    onToggleVideo,
    onStartScreenShare,
    onStopScreenShare,
    onEndCall
}: VideoControlsProps) {
    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-center gap-4"
        >
            {/* Audio Toggle */}
            <button
                onClick={onToggleAudio}
                className={cn(
                    "p-4 rounded-full transition-all shadow-lg",
                    isAudioMuted
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl"
                )}
                title={isAudioMuted ? "Unmute" : "Mute"}
            >
                {isAudioMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>

            {/* Video Toggle */}
            <button
                onClick={onToggleVideo}
                className={cn(
                    "p-4 rounded-full transition-all shadow-lg",
                    isVideoMuted
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl"
                )}
                title={isVideoMuted ? "Turn on camera" : "Turn off camera"}
            >
                {isVideoMuted ? <VideoOff size={24} /> : <Video size={24} />}
            </button>

            {/* Screen Share */}
            <button
                onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
                className={cn(
                    "p-4 rounded-full transition-all shadow-lg",
                    isScreenSharing
                        ? "bg-gopher-blue text-white"
                        : "bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl"
                )}
                title={isScreenSharing ? "Stop sharing" : "Share screen"}
            >
                <MonitorUp size={24} />
            </button>

            {/* End Call */}
            <button
                onClick={onEndCall}
                className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg"
                title="End call"
            >
                <PhoneOff size={24} />
            </button>

            {/* More Options */}
            <button
                className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl transition-all shadow-lg"
                title="More options"
            >
                <MoreVertical size={24} />
            </button>
        </motion.div>
    );
}