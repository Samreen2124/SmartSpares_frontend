import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user_data');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);

  // Synchronize authentication state on initial load
  useEffect(() => {
    const verifyUserSession = async () => {
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        try {
          const res = await apiClient.get('/auth/profile/');
          setUser(res.data);
          localStorage.setItem('user_data', JSON.stringify(res.data));
        } catch (err) {
          console.warn('Session verification failed, attempting token refresh...', err);
        }
      }
      setLoading(false);
    };

    verifyUserSession();

    // Listen for custom logout event emitted from Axios interceptor
    const handleAutoLogout = () => {
      logout(false);
    };
    window.addEventListener('auth:logout', handleAutoLogout);
    return () => window.removeEventListener('auth:logout', handleAutoLogout);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await apiClient.post('/auth/login/', {
        username: username.trim(),
        password: password,
      });

      const { access, refresh, user: userData } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user_data', JSON.stringify(userData));

      setToken(access);
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 
                       error.response?.data?.non_field_errors?.[0] || 
                       error.message || 'Login failed. Please check your credentials.';
      return { success: false, error: errorMsg };
    }
  };

  const logout = async (callServer = true) => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (callServer && refreshToken) {
      try {
        await apiClient.post('/auth/logout/', { refresh: refreshToken });
      } catch (err) {
        console.warn('Server logout error (proceeding with local cleanup):', err);
      }
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');

    setToken(null);
    setUser(null);
  };

  const isAuthenticated = Boolean(user && token);
  const isAdmin = Boolean(user && (user.role === 'ADMIN' || user.is_admin));

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        loading,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
