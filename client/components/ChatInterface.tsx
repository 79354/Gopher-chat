'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/store/chatStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { api } from '@/lib/api';
import { GopherLogo, SleepingGopher, DiggingGopher } from '@/components/GopherLogo';
import {
  Send,
  Paperclip,
  Smile,
  Video,
  LogOut,
  Users,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatInterface() {
  const [messageInput, setMessageInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    currentUser,
    onlineUsers,
    activeChat,
    messages,
    setActiveChat,
    setMessages,
  } = useChatStore();

  const { sendMessage, isConnected } = useWebSocket(currentUser?.userID || null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat]);

  // Load conversation history when selecting a user
  useEffect(() => {
    if (activeChat && currentUser) {
      const loadHistory = async () => {
        setLoadingHistory(true);
        try {
          const history = await api.getConversation(
            activeChat.userID,
            currentUser.userID
          );
          if (Array.isArray(history)) {
            setMessages(activeChat.userID, history);
          }
        } catch (error) {
          console.error('Failed to load conversation history:', error);
        } finally {
          setLoadingHistory(false);
        }
      };
      loadHistory();
    }
  }, [activeChat, currentUser, setMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat || !currentUser) return;

    sendMessage(activeChat.userID, messageInput);
    setMessageInput('');
  };

  const currentMessages = activeChat ? messages[activeChat.userID] || [] : [];

  return (
    <div className="h-screen bg-slate-950 flex overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-80 bg-white/5 backdrop-blur-2xl border-r border-white/10 flex flex-col"
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <GopherLogo size={40} />
            <div>
              <h1 className="text-xl font-bold text-white">GopherChat</h1>
              <p className="text-xs text-gray-400">
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </p>
            </div>
          </div>
        </div>

        {/* Current User */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gopher-blue to-gopher-purple flex items-center justify-center text-white font-bold">
                {currentUser?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-white font-semibold">{currentUser?.username}</p>
                <p className="text-xs text-gray-400">Online</p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Online Users */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Online Gophers ({onlineUsers.length})
              </h2>
            </div>

            <div className="space-y-2">
              {onlineUsers.map((user) => (
                <motion.button
                  key={user.userID}
                  onClick={() => setActiveChat(user)}
                  whileHover={{ x: 4 }}
                  className={cn(
                    'w-full p-3 rounded-xl transition-all text-left',
                    'hover:bg-white/10',
                    activeChat?.userID === user.userID
                      ? 'bg-gradient-to-r from-gopher-blue/20 to-gopher-purple/20 border border-gopher-blue/30'
                      : 'bg-white/5'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gopher-blue to-gopher-purple flex items-center justify-center text-white font-bold">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-950" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {user.username}
                      </p>
                      <p className="text-xs text-gray-400">Active now</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <motion.header
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="h-20 bg-white/5 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between px-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gopher-blue to-gopher-purple flex items-center justify-center text-white font-bold text-lg">
                  {activeChat.username[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-white font-semibold text-lg">
                    {activeChat.username}
                  </h2>
                  <p className="text-sm text-gray-400">Online</p>
                </div>
              </div>

              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-gray-500 cursor-not-allowed"
                title="Video call feature coming soon"
              >
                <Video className="w-5 h-5" />
                <span className="hidden sm:inline">Video Call</span>
              </button>
            </motion.header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <DiggingGopher />
                  <p className="text-gray-400">Loading conversation...</p>
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <SleepingGopher />
                  <p className="text-gray-400">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <>
                  <AnimatePresence mode="popLayout">
                    {currentMessages.map((msg, index) => {
                      const isMe = msg.fromUserID === currentUser?.userID;
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.3 }}
                          className={cn('flex', isMe ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'max-w-md px-4 py-3 rounded-2xl',
                              isMe
                                ? 'bg-gradient-to-r from-gopher-blue to-gopher-purple text-white rounded-br-sm'
                                : 'bg-white/10 backdrop-blur-xl border border-white/10 text-white rounded-bl-sm'
                            )}
                          >
                            <p className="break-words">{msg.message}</p>
                            {msg.timestamp && (
                              <p className="text-xs mt-1 opacity-70">
                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="p-6 bg-white/5 backdrop-blur-2xl border-t border-white/10"
            >
              <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                <button
                  type="button"
                  className="p-3 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                  title="Attach file (coming soon)"
                >
                  <Paperclip className="w-6 h-6" />
                </button>

                <div className="flex-1 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-gopher-blue transition-all">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full bg-transparent text-white placeholder-gray-400 outline-none"
                  />
                </div>

                <button
                  type="button"
                  className="p-3 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                  title="Add emoji (coming soon)"
                >
                  <Smile className="w-6 h-6" />
                </button>

                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className={cn(
                    'p-3 rounded-xl transition-all',
                    messageInput.trim()
                      ? 'bg-gradient-to-r from-gopher-blue to-gopher-purple hover:shadow-lg hover:shadow-gopher-blue/50 text-white'
                      : 'bg-white/5 text-gray-500 cursor-not-allowed'
                  )}
                >
                  <Send className="w-6 h-6" />
                </button>
              </form>
            </motion.div>
          </>
        ) : (
          // No Chat Selected
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <SleepingGopher />
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome to GopherChat
              </h2>
              <p className="text-gray-400">
                Select a gopher from the sidebar to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
