'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/chatStore';
import { api } from '@/lib/api';
import ChatInterface from '@/components/ChatInterface';
import { DiggingGopher } from '@/components/GopherLogo';

export default function ChatPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { currentUser, setCurrentUser } = useChatStore();

  useEffect(() => {
    const checkAuth = async () => {
      const userID = localStorage.getItem('userID');
      const username = localStorage.getItem('username');

      if (!userID || !username) {
        router.push('/');
        return;
      }

      // Verify session with backend
      const isValid = await api.checkSession(userID);
      
      if (isValid) {
        setCurrentUser({ userID, username });
        setLoading(false);
      } else {
        localStorage.clear();
        router.push('/');
      }
    };

    checkAuth();
  }, [router, setCurrentUser]);

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <DiggingGopher />
          <p className="mt-4 text-gray-400">Connecting to the burrow...</p>
        </div>
      </div>
    );
  }

  return <ChatInterface />;
}
