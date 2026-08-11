import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { authAPI, getCurrentUser, setAuthToken, setCurrentUser } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'employee';
  avatar?: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const navigate = useNavigate();

  const login = async (email: string, password: string) => {
    try {
      const response: any = await authAPI.login(email, password);
      if (response.success) {
        setAuthToken(response.data.accessToken);
        setCurrentUser(response.data.user);
        setUser(response.data.user);
        navigate('/');
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setUser(null);
    navigate('/login');
  };

  const hasRole = (roles: string[]) => {
    return user ? roles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
