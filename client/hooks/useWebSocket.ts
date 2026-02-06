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
  const { setOnlineUsers, addMessage, currentUser } = useChatStore();

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

  const handleMessageResponse = useCallback(
    (payload: any) => {
      if (!currentUser) return;

      const otherUserID =
        payload.fromUserID === currentUser.userID
          ? payload.toUserID
          : payload.fromUserID;

      // When we receive a message from the server:
      // 1. If it's an ACK for our own message, this will update the status to 'sent' (matched by tempId)
      // 2. If it's a new message from someone else, it will be added
      addMessage(otherUserID, {
        id: payload.id,         // Ensure backend sends this real ID
        tempId: payload.tempId, // Ensure backend echoes this back
        toUserID: payload.toUserID,
        fromUserID: payload.fromUserID,
        message: payload.message,
        timestamp: payload.createdAt
          ? new Date(payload.createdAt).getTime()
          : Date.now(),
        status: 'sent', // Messages coming from server are confirmed 'sent'
      });
    },
    [addMessage, currentUser]
  );

  const connect = useCallback(() => {
    if (!userID || wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(getWebSocketURL(userID));

    ws.onopen = () => {
      console.log('WebSocket connected');
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

          default:
            console.log('Unknown event:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    wsRef.current = ws;
  }, [userID, handleChatListResponse, handleMessageResponse]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((toUserID: string, content: string) => {
    if (!currentUser || !wsRef.current) return;

    // 1. Optimistic Update
    const tempId = crypto.randomUUID();

    const optimisticMessage: Message = {
      id: tempId, // Use tempId as ID initially
      tempId: tempId,
      toUserID,
      fromUserID: currentUser.userID,
      message: content,
      timestamp: Date.now(),
      status: 'sending'
    };

    // Immediately show in UI
    addMessage(toUserID, optimisticMessage);

    // 2. Send to Socket
    wsRef.current.send(JSON.stringify({
      type: 'message',
      payload: {
        ...optimisticMessage,
        // We strictly send what the server expects, plus tempId for ACK
        tempId
      }
    }));
  }, [currentUser, addMessage]);

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
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
};