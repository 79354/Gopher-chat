import { useEffect, useRef, useCallback } from 'react';
import { useChatStore, Message, OnlineUser } from '@/store/chatStore';
import { getWebSocketURL } from '@/lib/api';

interface WSMessage {
  type: string;
  payload: any;
}

interface ChatListPayload {
  type: string;
  chatlist?: OnlineUser[];
  user?: OnlineUser;
}

export const useWebSocket = (userID: string | null) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    setOnlineUsers,
    addMessage,
    updateMessageStatus,
    setSocketStatus,
    setTyping,
    currentUser
  } = useChatStore();

  // --- Handlers ---

  const handleChatListResponse = useCallback(
    (payload: ChatListPayload) => {
      if (payload.type === 'my-chatlist' && payload.chatlist) {
        setOnlineUsers(payload.chatlist);
      } else if (payload.type === 'new-user-joined' && payload.user) {
        useChatStore.setState((state) => ({
          onlineUsers: [...state.onlineUsers, payload.user!],
        }));
      } else if (payload.type === 'user-disconnected' && payload.user) {
        useChatStore.setState((state) => ({
          onlineUsers: state.onlineUsers.filter(
            (u) => u.userID !== payload.user!.userID
          ),
        }));
      }
    },
    [setOnlineUsers]
  );

  const handleMessageResponse = useCallback((payload: any) => {
    if (!currentUser) return;
    const otherUserID = payload.fromUserID === currentUser.userID ? payload.toUserID : payload.fromUserID;

    addMessage(otherUserID, {
      id: payload.id,
      tempId: payload.tempId,
      toUserID: payload.toUserID,
      fromUserID: payload.fromUserID,
      message: payload.message,
      timestamp: payload.createdAt ? new Date(payload.createdAt).getTime() : Date.now(),
      status: 'sent',
      type: payload.type || 'text' // Handle message types (text vs image)
    });
  }, [addMessage, currentUser]);

  const handleTypingEvent = useCallback((payload: any) => {
    if (payload.fromUserID !== currentUser?.userID) {
      setTyping(payload.fromUserID, payload.isTyping);
    }
  }, [currentUser, setTyping]);

  // --- Connection Logic ---

  const connect = useCallback(() => {
    if (!userID || wsRef.current?.readyState === WebSocket.OPEN) return;

    setSocketStatus('connecting');
    const ws = new WebSocket(getWebSocketURL(userID));

    ws.onopen = () => {
      console.log('WebSocket connected');
      setSocketStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);

        switch (data.type) {
          case 'chatlist-response':
            handleChatListResponse(data.payload);
            break;
          case 'message-response':
            handleMessageResponse(data.payload);
            break;
          case 'typing-response':
            handleTypingEvent(data.payload);
            break;
          default:
            console.log('Unknown event:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setSocketStatus('disconnected');
      wsRef.current = null;
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    wsRef.current = ws;
  }, [userID, setSocketStatus, handleChatListResponse, handleMessageResponse, handleTypingEvent]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setSocketStatus('disconnected');
  }, [setSocketStatus]);

  // --- Actions ---

  // Updated signature to accept 'type' (defaulting to 'text')
  const sendMessage = useCallback((toUserID: string, content: string, type: 'text' | 'image' = 'text') => {
    if (!currentUser) return;

    const tempId = crypto.randomUUID();
    const timestamp = Date.now();

    // 1. Optimistic UI
    addMessage(toUserID, {
      id: tempId,
      tempId,
      toUserID,
      fromUserID: currentUser.userID,
      message: content,
      timestamp,
      status: 'sending',
      type: type
    });

    // 2. Network Send
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        payload: {
          toUserID,
          fromUserID: currentUser.userID,
          message: content,
          tempId,
          type // Include type in payload
        }
      }));
    } else {
      updateMessageStatus(toUserID, tempId, 'failed');
    }
  }, [currentUser, addMessage, updateMessageStatus]);

  const sendTyping = useCallback((toUserID: string, isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && currentUser) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        payload: { toUserID, fromUserID: currentUser.userID, isTyping }
      }));
    }
  }, [currentUser]);

  useEffect(() => {
    if (userID) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [userID, connect, disconnect]);

  return {
    sendMessage,
    sendTyping,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
};