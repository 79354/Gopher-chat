import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const logout = useCallback(() => {
    localStorage.removeItem('chat_user_id');
    localStorage.removeItem('chat_username');
    setUser(null);
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    const validateSession = async () => {
      try {
        const userId = localStorage.getItem('chat_user_id');
        const username = localStorage.getItem('chat_username');
        
        if (userId && username) {
          const response = await authApi.checkSession(userId);
          if (response.Response === true) {
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
    try {
      const response = await authApi.login(credentials);
      console.log('Login API response:', JSON.stringify(response, null, 2));
      
      // Check all possible response formats
      if (response && response.Response) {
        const userID = response.Response.userID || response.Response.UserID;
        const username = response.Response.username || response.Response.Username;
        
        if (userID && username) {
          localStorage.setItem('chat_user_id', userID);
          localStorage.setItem('chat_username', username);
          
          setUser({ id: userID, username });
          navigate('/chat');
          return; // SUCCESS - exit here
        }
      }
      
      // If we get here, response format is wrong
      console.error('Unexpected response format:', response);
      throw new Error('Login succeeded but response format is unexpected');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (credentials) => {
    try {
      const response = await authApi.register(credentials);
      console.log('Registration API response:', JSON.stringify(response, null, 2));
      
      // Check all possible response formats
      if (response && response.Response) {
        const userID = response.Response.userID || response.Response.UserID;
        const username = response.Response.username || response.Response.Username;
        
        if (userID && username) {
          localStorage.setItem('chat_user_id', userID);
          localStorage.setItem('chat_username', username);
          
          setUser({ id: userID, username });
          navigate('/chat');
          return; // SUCCESS - exit here
        }
      }
      
      // If we get here, response format is wrong
      console.error('Unexpected response format:', response);
      throw new Error('Registration succeeded but response format is unexpected');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
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