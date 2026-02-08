'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Users, Settings, MoreVertical, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupMember {
    userId: string;
    username: string;
    role: 'admin' | 'member';
    avatar?: string;
}

interface GroupMessage {
    id: string;
    fromUserId: string;
    fromUsername: string;
    message: string;
    timestamp: number;
    type: 'text' | 'image' | 'file';
}

interface GroupChatProps {
    groupId: string;
    groupName: string;
    groupAvatar?: string;
    members: GroupMember[];
    messages: GroupMessage[];
    currentUserId: string;
    onSendMessage: (message: string) => void;
    onStartVideoCall: () => void;
}

export default function GroupChat({
    groupId,
    groupName,
    groupAvatar,
    members,
    messages,
    currentUserId,
    onSendMessage,
    onStartVideoCall
}: GroupChatProps) {
    const [messageInput, setMessageInput] = useState('');
    const [showMembers, setShowMembers] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim()) return;

        onSendMessage(messageInput);
        setMessageInput('');
    };

    return (
        <div className="flex h-full">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="h-20 bg-white/5 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gopher-blue to-gopher-purple flex items-center justify-center text-white font-bold overflow-hidden">
                            {groupAvatar ? (
                                <img src={groupAvatar} alt={groupName} className="w-full h-full object-cover" />
                            ) : (
                                <Users size={24} />
                            )}
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg">{groupName}</h2>
                            <p className="text-sm text-gray-400">{members.length} members</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onStartVideoCall}
                            className="p-3 hover:bg-white/10 rounded-xl text-gopher-blue transition-colors"
                            title="Start video call"
                        >
                            <Video size={20} />
                        </button>
                        <button
                            onClick={() => setShowMembers(!showMembers)}
                            className="p-3 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                            title="Members"
                        >
                            <Users size={20} />
                        </button>
                        <button className="p-3 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors">
                            <Settings size={20} />
                        </button>
                        <button className="p-3 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors">
                            <MoreVertical size={20} />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg) => {
                        const isMe = msg.fromUserId === currentUserId;

                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "flex gap-3",
                                    isMe && "flex-row-reverse"
                                )}
                            >
                                {!isMe && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gopher-blue to-gopher-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        {msg.fromUsername[0].toUpperCase()}
                                    </div>
                                )}

                                <div className={cn("max-w-[70%]", isMe && "items-end")}>
                                    {!isMe && (
                                        <p className="text-xs text-gray-400 mb-1 px-1">{msg.fromUsername}</p>
                                    )}
                                    <div
                                        className={cn(
                                            "px-4 py-2 rounded-2xl",
                                            isMe
                                                ? "bg-gopher-blue text-white rounded-tr-sm"
                                                : "bg-white/10 text-white rounded-tl-sm"
                                        )}
                                    >
                                        <p className="break-words">{msg.message}</p>
                                        <p className="text-xs opacity-70 mt-1">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white/5 backdrop-blur-xl border-t border-white/10">
                    <form onSubmit={handleSubmit} className="flex gap-3">
                        <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder={`Message ${groupName}...`}
                            className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gopher-blue transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!messageInput.trim()}
                            className={cn(
                                "p-3 rounded-xl transition-all",
                                messageInput.trim()
                                    ? "bg-gopher-blue hover:bg-gopher-blue/90 text-white"
                                    : "bg-white/5 text-gray-500 cursor-not-allowed"
                            )}
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </div>

            {/* Members Sidebar */}
            <AnimatePresence>
                {showMembers && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 280, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="bg-white/5 border-l border-white/10 overflow-hidden"
                    >
                        <div className="p-4">
                            <h3 className="text-white font-semibold mb-4">Members ({members.length})</h3>
                            <div className="space-y-2">
                                {members.map((member) => (
                                    <div
                                        key={member.userId}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gopher-blue to-gopher-purple flex items-center justify-center text-white text-xs font-bold">
                                            {member.username[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white text-sm font-medium">{member.username}</p>
                                            <p className="text-xs text-gray-400">{member.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}