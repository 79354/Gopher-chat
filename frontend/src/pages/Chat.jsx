import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { IoSend, IoLogOutOutline } from 'react-icons/io5';

const Chat = () => {
  const { user, logout } = useAuth();
  const { onlineUsers, messages, sendMessage } = useSocket();
  const [activeUser, setActiveUser] = useState(null);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeUser]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeUser) return;

    sendMessage(activeUser.userID, inputText);
    setInputText('');
  };

  const currentMessages = activeUser
    ? messages[[user.id, activeUser.userID].sort().join('_')] || []
    : [];

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-gray-900 dark:to-indigo-950">
      {/* Sidebar */}
      <motion.div 
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-80 bg-white dark:bg-gray-800 shadow-2xl flex flex-col border-r border-gray-200 dark:border-gray-700"
      >
        <div className="p-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
          <h1 className="text-2xl font-bold flex items-center mb-2">
            <span className="mr-2">💬</span>
            GopherChat
          </h1>
          <p className="text-indigo-100 text-sm">Real-time messaging</p>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Online ({onlineUsers.length})
              </span>
            </div>
            <button
              onClick={logout}
              className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              title="Logout"
            >
              <IoLogOutOutline size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <AnimatePresence>
            {onlineUsers.map((u) => (
              <motion.div
                key={u.userID}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                whileHover={{ x: 5 }}
                onClick={() => setActiveUser(u)}
                className={`flex items-center p-4 cursor-pointer transition-all ${
                  activeUser?.userID === u.userID
                    ? 'bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 border-l-4 border-indigo-600'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-800"></div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">{u.username}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Online now</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
              {user?.username[0].toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.username}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">You</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeUser ? (
          <>
            {/* Chat Header */}
            <motion.div 
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <div className="flex items-center">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    {activeUser.username[0].toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-800"></div>
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{activeUser.username}</h2>
                  <p className="text-sm text-green-500 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Active now
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
              <div className="space-y-4">
                <AnimatePresence>
                  {currentMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-md ${
                          msg.senderId === user.id
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md'
                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                        }`}
                      >
                        <p className="break-words">{msg.text}</p>
                        <div
                          className={`text-xs mt-1 ${
                            msg.senderId === user.id
                              ? 'text-indigo-200 text-right'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <form onSubmit={handleSend} className="flex items-center gap-3">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 rounded-full border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  <IoSend size={24} />
                </motion.button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center p-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-3xl shadow-2xl"
            >
              <div className="text-7xl mb-6 animate-bounce">💬</div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                Select a conversation
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a user from the sidebar to start chatting
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;