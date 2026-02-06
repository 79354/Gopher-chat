'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore, Message } from '@/store/chatStore';
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
  Check,
  CheckCheck,
  AlertCircle,
  MoreVertical,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatInterface() {
  const [messageInput, setMessageInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    currentUser,
    onlineUsers,
    activeChat,
    messages,
    typingUsers,
    socketStatus,
    setActiveChat,
    setMessages,
  } = useChatStore();

  const { sendMessage, sendTyping } = useWebSocket(currentUser?.userID || null);

  // --- Auto-Scroll Logic (Smart) ---
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    // Scroll on new message, active chat change, or typing
    scrollToBottom();
  }, [messages, activeChat, typingUsers]);

  // --- Load Conversation History ---
  useEffect(() => {
    if (activeChat && currentUser) {
      const loadHistory = async () => {
        setLoadingHistory(true);
        try {
          const history = await api.getConversation(activeChat.userID, currentUser.userID);
          if (Array.isArray(history)) {
            // Normalize history messages to have a 'read' status
            const formattedHistory: Message[] = history.map((msg: any) => ({
              ...msg,
              id: msg.id || msg._id, // Handle DB ID variations
              timestamp: msg.timestamp || new Date(msg.createdAt).getTime(),
              status: 'read', // History is assumed read
              type: 'text'
            }));
            setMessages(activeChat.userID, formattedHistory);
          }
        } catch (error) {
          console.error('Failed to load history', error);
        } finally {
          setLoadingHistory(false);
        }
      };
      loadHistory();
    }
  }, [activeChat, currentUser, setMessages]);

  // --- Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);

    if (activeChat) {
      sendTyping(activeChat.userID, true);

      // Debounce stop typing (1.5s)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(activeChat.userID, false);
      }, 1500);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat) return;

    sendMessage(activeChat.userID, messageInput);
    setMessageInput('');

    // Stop typing immediately when sent
    sendTyping(activeChat.userID, false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  // --- Render Helpers ---
  const currentMessages = activeChat ? messages[activeChat.userID] || [] : [];
  const isRecipientTyping = activeChat ? typingUsers[activeChat.userID] : false;

  return (
    <div className="h-screen bg-slate-950 flex overflow-hidden font-body">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-80 bg-white/5 backdrop-blur-2xl border-r border-white/10 flex flex-col z-20"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <GopherLogo size={40} />
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">GopherChat</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  socketStatus === 'connected' ? "bg-green-500" :
                    socketStatus === 'connecting' ? "bg-yellow-500" : "bg-red-500"
                )} />
                <span className="text-xs text-gray-400 capitalize">
                  {socketStatus === 'connected' ? 'Online' : socketStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile (Mini) */}
        <div className="px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gopher-blue to-gopher-purple flex items-center justify-center text-white font-bold shadow-lg">
                {currentUser?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-white font-semibold truncate max-w-[120px]">
                  {currentUser?.username}
                </p>
                <p className="text-xs text-gray-400">#{currentUser?.userID?.slice(0, 4)}</p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-red-400"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4 px-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Online ({onlineUsers.length})
              </h2>
            </div>

            <div className="space-y-1">
              {onlineUsers.map((user) => (
                <button
                  key={user.userID}
                  onClick={() => setActiveChat(user)}
                  className={cn(
                    'w-full p-3 rounded-xl transition-all text-left flex items-center gap-3 group',
                    activeChat?.userID === user.userID
                      ? 'bg-gradient-to-r from-gopher-blue/10 to-gopher-purple/10 border border-gopher-blue/30'
                      : 'hover:bg-white/5 border border-transparent'
                  )}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-semibold border border-white/10 group-hover:border-white/20 transition-colors">
                      {user.username[0].toUpperCase()}
                    </div>
                    {/* Status Dot */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-slate-950 rounded-full flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className={cn(
                        "font-medium truncate",
                        activeChat?.userID === user.userID ? "text-white" : "text-gray-300"
                      )}>
                        {user.username}
                      </p>
                    </div>
                    {typingUsers[user.userID] ? (
                      <p className="text-xs text-gopher-blue font-medium animate-pulse">Typing...</p>
                    ) : (
                      <p className="text-xs text-gray-500 truncate">
                        Click to chat
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-950 relative">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-gopher-blue/5 to-transparent pointer-events-none" />

        {activeChat ? (
          <>
            {/* Top Bar */}
            <motion.header
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="h-20 bg-white/5 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 z-10"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gopher-blue to-gopher-purple flex items-center justify-center text-white font-bold shadow-lg">
                  {activeChat.username[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">
                    {activeChat.username}
                  </h2>
                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    {isRecipientTyping ? (
                      <span className="text-gopher-blue font-medium animate-pulse">Typing...</span>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Online
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                  <Video className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-white/10 mx-2" />
                <button className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </motion.header>

            {/* Messages Canvas */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-1 custom-scrollbar"
            >
              {loadingHistory ? (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <DiggingGopher />
                  <p className="text-gray-400 animate-pulse">Digging up history...</p>
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-6 opacity-50">
                  <SleepingGopher />
                  <div className="text-center">
                    <p className="text-white text-lg font-medium">No messages yet</p>
                    <p className="text-gray-400 text-sm">Say hello to start the conversation!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Date Separator (Mockup for now) */}
                  <div className="flex justify-center">
                    <div className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs text-gray-500">
                      Today
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {currentMessages.map((msg, index) => {
                      const isMe = msg.fromUserID === currentUser?.userID;
                      const prevMsg = currentMessages[index - 1];
                      // Group if same sender and < 5 mins apart
                      const isGrouped = prevMsg &&
                        prevMsg.fromUserID === msg.fromUserID &&
                        (msg.timestamp - prevMsg.timestamp < 5 * 60 * 1000);

                      return (
                        <motion.div
                          key={msg.id || msg.tempId || index}
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className={cn(
                            "flex w-full",
                            isMe ? "justify-end" : "justify-start",
                            isGrouped ? "mt-1" : "mt-4"
                          )}
                        >
                          <div className={cn("max-w-[70%]", isMe ? "items-end" : "items-start")}>
                            {/* Message Bubble */}
                            <div className={cn(
                              "px-4 py-2 text-sm md:text-base relative group shadow-sm transition-all",
                              isMe
                                ? "bg-gopher-blue text-white rounded-2xl rounded-tr-sm"
                                : "bg-white/10 text-white rounded-2xl rounded-tl-sm border border-white/5",
                              msg.status === 'sending' && "opacity-70",
                              msg.status === 'failed' && "border-red-500/50 bg-red-500/10"
                            )}>
                              <p className="break-words leading-relaxed whitespace-pre-wrap">{msg.message}</p>

                              {/* Meta Info */}
                              <div className={cn(
                                "flex items-center gap-1 mt-1 select-none",
                                isMe ? "justify-end text-blue-100/70" : "justify-start text-gray-400"
                              )}>
                                <span className="text-[10px]">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>

                                {isMe && (
                                  <span className="flex items-center" title={msg.status}>
                                    {msg.status === 'sending' && <span className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full" />}
                                    {msg.status === 'sent' && <Check className="w-3 h-3" />}
                                    {msg.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
                                    {msg.status === 'read' && <CheckCheck className="w-3 h-3 text-white" />}
                                    {msg.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-400" />}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Typing Bubble */}
                  {isRecipientTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start mt-2"
                    >
                      <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 border border-white/5 items-center h-10">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white/5 backdrop-blur-2xl border-t border-white/10">
              <div className="max-w-4xl mx-auto">
                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                  <button
                    type="button"
                    className="p-3 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                    title="Attachments"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <div className="flex-1 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl focus-within:ring-2 focus-within:ring-gopher-blue/50 focus-within:bg-white/15 transition-all">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={handleInputChange}
                      placeholder={`Message ${activeChat.username}...`}
                      className="w-full bg-transparent text-white placeholder-gray-400 outline-none px-4 py-3"
                    />
                  </div>

                  <button
                    type="button"
                    className="p-3 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  <button
                    type="submit"
                    disabled={!messageInput.trim() || socketStatus !== 'connected'}
                    className={cn(
                      "p-3 rounded-xl transition-all shadow-lg",
                      messageInput.trim() && socketStatus === 'connected'
                        ? "bg-gopher-blue hover:bg-gopher-blue/90 text-white hover:scale-105 active:scale-95"
                        : "bg-white/5 text-gray-500 cursor-not-allowed"
                    )}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
                <div className="text-center mt-2">
                  <p className="text-[10px] text-gray-600">
                    Press Enter to send • Shift + Enter for new line
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gopher-blue/20 blur-[100px] rounded-full" />
              <SleepingGopher />
            </div>
            <div className="text-center max-w-md relative z-10">
              <h2 className="text-3xl font-bold text-white mb-3">
                Welcome to GopherChat
              </h2>
              <p className="text-gray-400 text-lg">
                Real-time conversations powered by Go.
                <br />
                Select a user from the sidebar to begin.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}