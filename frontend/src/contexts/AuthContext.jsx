import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const validateSession = async () => {
      try {
        const userId = localStorage.getItem('chat_user_id');
        const username = localStorage.getItem('chat_username');
        
        if (userId && username) {
          const response = await authApi.checkSession(userId);
          if (response.Response) {
            setUser({ id: userId, username });
          } else {
            logout();
          }
        }
      } catch (error) {
        console.error('Session validation failed:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, [logout]);

  const login = async (credentials) => {
    const response = await authApi.login(credentials);
    const { userID, username } = response.Response;
    
    localStorage.setItem('chat_user_id', userID);
    localStorage.setItem('chat_username', username);
    
    setUser({ id: userID, username });
    navigate('/chat');
  };

  const register = async (credentials) => {
    const response = await authApi.register(credentials);
    const { userID, username } = response.Response;
    
    localStorage.setItem('chat_user_id', userID);
    localStorage.setItem('chat_username', username);
    
    setUser({ id: userID, username });
    navigate('/chat');
  };

  const logout = () => {
    localStorage.removeItem('chat_user_id');
    localStorage.removeItem('chat_username');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};