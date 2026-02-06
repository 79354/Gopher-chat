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

      addMessage(otherUserID, {
        toUserID: payload.toUserID,
        fromUserID: payload.fromUserID,
        message: payload.message,
        timestamp: payload.createdAt
          ? new Date(payload.createdAt).getTime()
          : Date.now(),
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

  const sendMessage = useCallback(
    (toUserID: string, message: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error('WebSocket is not connected');
        return;
      }

      if (!currentUser) {
        console.error('No current user');
        return;
      }

      const payload: WSMessage = {
        type: 'message',
        payload: {
          toUserID,
          fromUserID: currentUser.userID,
          message,
        },
      };

      wsRef.current.send(JSON.stringify(payload));
    },
    [currentUser]
  );

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
