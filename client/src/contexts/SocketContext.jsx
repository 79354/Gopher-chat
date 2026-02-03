import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState({});
  const wsRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Create WebSocket connection
    const ws = new WebSocket(`ws://localhost:8080/ws/${user.id}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      // Send join event
      ws.send(JSON.stringify({
        eventname: "join",
        eventpayload: user.id
      }));
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      
      if (payload.eventname === 'chatlist-response') {
        const data = payload.eventpayload;
        
        if (data.type === 'my-chatlist') {
          setOnlineUsers(data.chatlist || []);
        } else if (data.type === 'new-user-joined') {
          setOnlineUsers(prev => {
            const exists = prev.some(u => u.userID === data.chatlist.userID);
            if (exists) return prev;
            return [...prev, data.chatlist];
          });
        } else if (data.type === 'user-disconnected') {
          setOnlineUsers(prev => prev.filter(u => u.userID !== data.chatlist.userID));
        }
      } else if (payload.eventname === 'message-response') {
        const msg = payload.eventpayload;
        const conversationId = [msg.fromUserID, msg.toUserID].sort().join('_');
        
        setMessages(prev => ({
          ...prev,
          [conversationId]: [
            ...(prev[conversationId] || []),
            {
              id: Date.now().toString() + Math.random(),
              text: msg.message,
              senderId: msg.fromUserID,
              timestamp: new Date().toISOString()
            }
          ]
        }));
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          eventname: "disconnect",
          eventpayload: user.id
        }));
        ws.close();
      }
    };
  }, [user]);

  const sendMessage = (toUserId, message) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !user) return;
    
    const payload = {
      eventname: 'message',
      eventpayload: {
        message,
        toUserID: toUserId,
        fromUserID: user.id
      }
    };
    
    wsRef.current.send(JSON.stringify(payload));
    
    // Optimistic update
    const conversationId = [user.id, toUserId].sort().join('_');
    setMessages(prev => ({
      ...prev,
      [conversationId]: [
        ...(prev[conversationId] || []),
        {
          id: Date.now().toString() + Math.random(),
          text: message,
          senderId: user.id,
          timestamp: new Date().toISOString()
        }
      ]
    }));
  };

  return (
    <SocketContext.Provider value={{ onlineUsers, messages, sendMessage }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};