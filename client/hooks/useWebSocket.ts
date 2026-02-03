import { useEffect, useRef, useCallback } from 'react';
import { useChatStore, Message, OnlineUser } from '@/store/chatStore';
import { getWebSocketURL } from '@/lib/api';

interface WebSocketMessage {
  eventname: string;
  eventpayload: any;
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
        // Add new user to the list
        useChatStore.setState((state) => ({
          onlineUsers: [...state.onlineUsers, payload.user!],
        }));
      } else if (payload.type === 'user-disconnected' && payload.user) {
        // Remove user from the list
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
    (payload: Message) => {
      if (!currentUser) return;

      // Determine the other user's ID
      const otherUserID =
        payload.fromUserID === currentUser.userID
          ? payload.toUserID
          : payload.fromUserID;

      addMessage(otherUserID, {
        ...payload,
        timestamp: Date.now(),
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
        const data: WebSocketMessage = JSON.parse(event.data);

        switch (data.eventname) {
          case 'chatlist-response':
            handleChatListResponse(data.eventpayload);
            break;
          case 'message-response':
            handleMessageResponse(data.eventpayload);
            break;
          default:
            console.log('Unknown event:', data.eventname);
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
      // Attempt to reconnect after 3 seconds
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

      const payload: WebSocketMessage = {
        eventname: 'message',
        eventpayload: {
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
