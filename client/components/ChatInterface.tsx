'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore, Message } from '@/store/chatStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { api } from '@/lib/api';
import { GopherLogo, SleepingGopher, DiggingGopher, PeekingGopher } from '@/components/GopherLogo';
import EmojiPicker, { Theme } from 'emoji-picker-react';
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
  Phone,
  UserPlus,
  X,
  Search,
  Globe,
  Bell,
  Shuffle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatInterface() {
  const [messageInput, setMessageInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Friend System States
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  const {
    currentUser,
    onlineUsers,
    activeChat,
    messages,
    typingUsers,
    socketStatus,
    friends,
    setActiveChat,
    setMessages,
    setFriends,
  } = useChatStore();

  const { sendMessage, sendTyping } = useWebSocket(currentUser?.userID || null);

  // --- Filtered Lists ---

  // 1. Create a Set of Online IDs for O(1) lookup and type safety
  const onlineIDs = new Set(onlineUsers.map(u => String(u.userID)));
  const onlineFriends = friends.filter(friend => onlineIDs.has(String(friend.userID)));
  const offlineFriends = friends.filter(friend => !onlineIDs.has(String(friend.userID)));

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChat, typingUsers]);

  // --- Load Friends on Mount ---
  useEffect(() => {
    if (currentUser) {
      api.getFriends(currentUser.userID).then((friendsList) => {
        setFriends(friendsList || []);
      }).catch(err => {
        console.error('Failed to load friends:', err);
        setFriends([]);
      });
    }
  }, [currentUser, setFriends]);

  // --- Load Conversation History ---
  useEffect(() => {
    if (activeChat && currentUser) {
      const loadHistory = async () => {
        setLoadingHistory(true);
        try {
          const history = await api.getConversation(activeChat.userID, currentUser.userID);
          if (Array.isArray(history)) {
            const formattedHistory: Message[] = history.map((msg: any) => ({
              ...msg,
              id: msg.id || msg._id,
              timestamp: msg.timestamp || new Date(msg.createdAt).getTime(),
              status: 'read',
              type: msg.type || 'text'
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
      setShowEmojiPicker(false);
    }
  }, [activeChat, currentUser, setMessages]);

  // Fetch pending requests on mount
  useEffect(() => {
    if (currentUser) {
      api.getPendingRequests(currentUser.userID).then(setPendingRequests);
    }
  }, [currentUser, showNotifications]); // Refresh when modal opens

  const handleAcceptRequest = async (requesterID: string) => {
    if (!currentUser) return;
    const success = await api.acceptFriendRequest(requesterID);
    if (success) {
      // Remove from list and refresh friends
      setPendingRequests(prev => prev.filter(req => req.id !== requesterID));
      const updatedFriends = await api.getFriends(currentUser.userID);
      setFriends(updatedFriends);
      alert("Friend request accepted!");
    }
  };

  // --- Friend Search Handler ---
  const handleSearchFriend = async () => {
    if (!friendSearchQuery.trim()) return;

    setSearching(true);
    setSearchResult(null);

    try {
      const exists = await api.checkUsername(friendSearchQuery.trim());
      if (exists) {
        setSearchResult({ username: friendSearchQuery.trim(), found: true });
      } else {
        setSearchResult({ username: friendSearchQuery.trim(), found: false });
      }
    } catch (e) {
      console.error('Search error:', e);
      setSearchResult({ username: friendSearchQuery.trim(), found: false });
    } finally {
      setSearching(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!currentUser || !searchResult?.found) return;

    try {
      const success = await api.sendFriendRequest(searchResult.username);
      if (success) {
        alert(`Friend request sent to ${searchResult.username}!`);
        setShowFriendModal(false);
        setFriendSearchQuery('');
        setSearchResult(null);
      } else {
        alert('Failed to send friend request. They might already be your friend.');
      }
    } catch (err) {
      alert('Error sending friend request');
    }
  };

  // --- Message Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);

    if (activeChat) {
      sendTyping(activeChat.userID, true);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(activeChat.userID, false);
      }, 1500);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChat) return;

    // @ts-ignore
    sendMessage(activeChat.userID, messageInput, 'text');

    setMessageInput('');
    setShowEmojiPicker(false);

    sendTyping(activeChat.userID, false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleEmojiClick = (emojiData: any) => {
    setMessageInput((prev) => prev + emojiData.emoji);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeChat) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // @ts-ignore
        sendMessage(activeChat.userID, base64String, 'image');
      };
      reader.readAsDataURL(file);
    }
  };

  const currentMessages = activeChat ? messages[activeChat.userID] || [] : [];
  const isRecipientTyping = activeChat ? typingUsers[activeChat.userID] : false;

  const handleGlobalChat = () => {
    // For now, let's treat Global Chat as a special "user"
    // Note: Backend needs to support "global" ID or we create a dummy user
    setActiveChat({
      userID: "global",
      username: "Global Chat",
      status: "online"
    });
  };

  const handleRandomChat = async () => {
    if (!currentUser) return;
    const match = await api.joinRandomChat(currentUser.userID);
    if (match && match.matchID) {
      setActiveChat({
        userID: match.matchID,
        username: "Anonymous Gopher",
        status: "online"
      });
    } else {
      alert("Waiting for a random partner...");
    }
  };

  return (
    <div className="h-screen bg-slate-950 flex overflow-hidden font-body relative">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* ========== SIDEBAR ========== */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-80 bg-white/5 backdrop-blur-2xl border-r border-white/10 flex flex-col z-20"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <GopherLogo size={32} />
            <span className="font-bold text-white">GopherChat</span>
          </div>

          <div className="flex gap-2">
            {/* Inbox Button */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 hover:bg-white/10 rounded-full text-gopher-blue transition-colors"
            >
              <Bell size={20} />
              {pendingRequests.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>

            {/* Existing Find Friend Button */}
            <button
              onClick={() => setShowFriendModal(true)}
              className="p-2 hover:bg-white/10 rounded-full text-gopher-blue transition-colors"
            >
              <UserPlus size={20} />
            </button>
          </div>
        </div>

        {/* Global & Random Chat Options */}
        <div className="p-4 space-y-2">
          <button
            onClick={handleGlobalChat}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-all"
          >
            <div className="p-2 bg-gopher-purple/20 rounded-lg text-gopher-purple">
              <Globe size={20} />
            </div>
            <div className="text-left">
              <p className="font-semibold">Global Chat</p>
              <p className="text-xs opacity-50">Talk with everyone</p>
            </div>
          </button>

          {/* Random Chat Button */}
          <button
            onClick={handleRandomChat}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-all"
          >
            <div className="p-2 bg-gopher-purple/20 rounded-lg text-gopher-purple">
              <Shuffle size={20} />
            </div>
            <div className="text-left">
              <p className="font-semibold">Random Chat</p>
              <p className="text-xs opacity-50">Talk to Stranger</p>
            </div>
          </button>
        </div>

        <div className="h-px bg-white/10 mx-6 my-2" />

        {/* Friends List - ONLY SHOW ONLINE FRIENDS */}
        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">

          {/* ONLINE FRIENDS */}
          {onlineFriends.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Online — {onlineFriends.length}</h3>
              {onlineFriends.map(friend => (
                <button
                  key={friend.userID}
                  onClick={() => setActiveChat(friend)}
                  className={cn(
                    "w-full p-2 flex items-center gap-3 rounded-lg transition-colors mb-1",
                    activeChat?.userID === friend.userID ? "bg-white/10" : "hover:bg-white/5"
                  )}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gopher-blue to-gopher-purple flex items-center justify-center text-white font-bold">
                      {friend.username[0].toUpperCase()}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                  </div>
                  <div className="text-left overflow-hidden">
                    <p className="text-white font-medium truncate">{friend.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* OFFLINE FRIENDS */}
          {offlineFriends.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Offline — {offlineFriends.length}</h3>
              {offlineFriends.map(friend => (
                <button
                  key={friend.userID}
                  onClick={() => setActiveChat(friend)}
                  className={cn(
                    "w-full p-2 flex items-center gap-3 rounded-lg transition-colors mb-1 opacity-70 hover:opacity-100",
                    activeChat?.userID === friend.userID ? "bg-white/10" : "hover:bg-white/5"
                  )}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
                      {friend.username[0].toUpperCase()}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-500 border-2 border-slate-900 rounded-full"></div>
                  </div>
                  <div className="text-left overflow-hidden">
                    <p className="text-gray-300 font-medium truncate">{friend.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {friends.length === 0 && (
            <div className="text-center mt-10 opacity-50">
              <p>No friends yet.</p>
              <p className="text-xs">Search to add some!</p>
            </div>
          )}
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gopher-blue to-gopher-purple flex items-center justify-center text-white font-bold">
                {currentUser?.username?.[0]?.toUpperCase()}
              </div>
              <div className="text-sm">
                <p className="text-white font-medium">{currentUser?.username}</p>
                <p className="text-xs text-gray-500">#{currentUser?.userID.slice(0, 4)}</p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* ========== MAIN CHAT AREA ========== */}
      <div className="flex-1 flex flex-col bg-slate-950 relative">
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
              className="flex-1 overflow-y-auto p-6 space-y-1 custom-scrollbar relative"
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
                  <div className="flex justify-center">
                    <div className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-xs text-gray-500">
                      Today
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {currentMessages.map((msg, index) => {
                      const isMe = msg.fromUserID === currentUser?.userID;
                      const prevMsg = currentMessages[index - 1];
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
                            <div className={cn(
                              "px-4 py-2 text-sm md:text-base relative group shadow-sm transition-all",
                              isMe
                                ? "bg-gopher-blue text-white rounded-2xl rounded-tr-sm"
                                : "bg-white/10 text-white rounded-2xl rounded-tl-sm border border-white/5",
                              msg.status === 'sending' && "opacity-70",
                              msg.status === 'failed' && "border-red-500/50 bg-red-500/10"
                            )}>
                              {msg.type === 'image' ? (
                                <img
                                  src={msg.message}
                                  alt="Attachment"
                                  className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(msg.message, '_blank')}
                                />
                              ) : (
                                <p className="break-words leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                              )}

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
            <div className="p-4 bg-white/5 backdrop-blur-2xl border-t border-white/10 relative z-30">
              <PeekingGopher isTyping={isRecipientTyping} />
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-full right-4 mb-4 z-50"
                  >
                    <div className="shadow-2xl rounded-2xl overflow-hidden border border-white/10">
                      <EmojiPicker
                        theme={Theme.DARK}
                        onEmojiClick={handleEmojiClick}
                        width={320}
                        height={400}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="max-w-4xl mx-auto">
                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                    title="Send Image"
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
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={cn(
                      "p-3 rounded-xl transition-colors",
                      showEmojiPicker ? "bg-white/10 text-gopher-blue" : "hover:bg-white/10 text-gray-400 hover:text-white"
                    )}
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
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gopher-blue/20 blur-[100px] rounded-full" />
              <SleepingGopher />
            </div>
            <div className="text-center max-w-md relative z-10">
              <h2 className="text-3xl font-bold text-white mb-3">
                Welcome to GopherChat
              </h2>
              <p className="text-gray-400 text-lg mb-4">
                Real-time conversations powered by Go.
              </p>
              <button
                onClick={() => setShowFriendModal(true)}
                className="px-6 py-3 bg-gopher-blue hover:bg-gopher-blue/90 rounded-xl text-white font-semibold transition-colors"
              >
                Find Friends to Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/*ADD FRIEND MODAL*/}
      <AnimatePresence>
        {showFriendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowFriendModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Find Gophers</h2>
                <button
                  onClick={() => setShowFriendModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X />
                </button>
              </div>

              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={friendSearchQuery}
                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchFriend()}
                  placeholder="Enter username..."
                  className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-gopher-blue transition-colors"
                />
                <button
                  onClick={handleSearchFriend}
                  disabled={searching || !friendSearchQuery.trim()}
                  className="bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded-xl text-white transition-colors"
                >
                  {searching ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search size={20} />
                  )}
                </button>
              </div>

              {searchResult && (
                <div className={cn(
                  "border rounded-xl p-4 flex justify-between items-center",
                  searchResult.found
                    ? "bg-green-500/10 border-green-500/20"
                    : "bg-red-500/10 border-red-500/20"
                )}>
                  <div>
                    <p className="text-white font-bold">{searchResult.username}</p>
                    <p className={cn(
                      "text-xs",
                      searchResult.found ? "text-green-400" : "text-red-400"
                    )}>
                      {searchResult.found ? "User found" : "User not found"}
                    </p>
                  </div>
                  {searchResult.found && (
                    <button
                      onClick={handleSendFriendRequest}
                      className="bg-gopher-blue text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gopher-blue/80 transition-colors"
                    >
                      Add Friend
                    </button>
                  )}
                </div>
              )}

              {!searchResult && (
                <p className="text-gray-500 text-sm text-center py-8">
                  Search for a username to send a friend request
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NOTIFICATIONS MODAL */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNotifications(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Notifications</h2>
                <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-white">
                  <X />
                </button>
              </div>

              <div className="space-y-4">
                {pendingRequests.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No pending requests.</p>
                ) : (
                  pendingRequests.map((req) => (
                    <div key={req.id} className="bg-white/5 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-white font-bold">{req.username}</p>
                        <p className="text-xs text-gray-400">Wants to be friends</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="p-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30"
                        >
                          <Check size={18} />
                        </button>
                        <button className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30">
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}