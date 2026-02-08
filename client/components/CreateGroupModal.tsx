'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateGroup: (name: string, description: string, avatar: string, memberIds: string[]) => Promise<void>;
    currentUserId: string;
}

export default function CreateGroupModal({
    isOpen,
    onClose,
    onCreateGroup,
    currentUserId
}: CreateGroupModalProps) {
    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [avatar, setAvatar] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!groupName.trim()) {
            setError('Group name is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await onCreateGroup(groupName, description, avatar, selectedMembers);
            // Reset form
            setGroupName('');
            setDescription('');
            setAvatar('');
            setSelectedMembers([]);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gopher-blue/20 rounded-lg">
                                    <Users className="w-6 h-6 text-gopher-blue" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Create Group</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Group Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Group Name *
                                </label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="Enter group name..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gopher-blue transition-all"
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What's this group about?"
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gopher-blue transition-all resize-none"
                                />
                            </div>

                            {/* Avatar Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Group Avatar (Optional)
                                </label>
                                <div className="flex gap-4 items-center">
                                    {avatar && (
                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-800">
                                            <img src={avatar} alt="Group" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 hover:bg-white/10 transition-colors"
                                    >
                                        <ImageIcon size={20} />
                                        <span>Upload Image</span>
                                    </button>
                                </div>
                            </div>

                            {/* TODO: Add member selection */}
                            {/* This would show a list of friends to add to the group */}

                            {/* Error Message */}
                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-red-400 text-sm"
                                >
                                    {error}
                                </motion.p>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !groupName.trim()}
                                    className={cn(
                                        "flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all",
                                        "bg-gradient-to-r from-gopher-blue to-gopher-purple",
                                        "hover:shadow-lg hover:shadow-gopher-blue/50",
                                        "disabled:opacity-50 disabled:cursor-not-allowed",
                                        "flex items-center justify-center gap-2"
                                    )}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Group'
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}