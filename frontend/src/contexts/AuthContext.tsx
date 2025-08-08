import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '../lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar?: string;
  provider: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  loginWithGitHub: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Special function for auth requests that don't use the standard API response format
const authRequest = async (endpoint: string, options: RequestInit = {}) => {
  // API base URL - use relative path for unified server
  const API_BASE_URL = '/api';
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get auth token
  const token = localStorage.getItem('token');
  
  // Prepare headers
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  });

  // Add auth header if token exists
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const response = await fetch(url, {
    headers,
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      if (response.status === 401) {
        errorMessage = 'Authentication required. Please log in.';
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Authentication failed');
  }

  return data;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await authRequest('/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setUser(response.user);
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (username: string, password: string) => {
    try {
      setError(null);
      const response = await authRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      const { token: newToken, user: userData } = response;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string, name?: string) => {
    try {
      setError(null);
      const response = await authRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, name }),
      });

      const { token: newToken, user: userData } = response;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const loginWithGitHub = () => {
    const backendUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
    window.location.href = `${backendUrl}/auth/github`;
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loginWithGitHub,
    isLoading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 