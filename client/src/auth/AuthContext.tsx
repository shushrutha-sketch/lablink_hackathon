import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../lib/types.js';
import { apiRequest } from '../api/client.js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  demoUsers: User[];
  login: (email: string, password?: string) => Promise<void>;
  switchPersona: (targetUser: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);

  // Fetch demo users for the persona switcher
  useEffect(() => {
    apiRequest<{ users: User[] }>('/auth/demo-users')
      .then(res => setDemoUsers(res.users))
      .catch(err => console.warn('Could not load demo users:', err));
  }, []);

  // Check current session
  useEffect(() => {
    apiRequest<{ user: User }>('/auth/me')
      .then(res => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password = 'password123') => {
    const res = await apiRequest<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      localStorage.setItem('lablink_token', res.token);
    }
    setUser(res.user);
  };

  const switchPersona = async (targetUser: User) => {
    await login(targetUser.email, 'password123');
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('lablink_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, demoUsers, login, switchPersona, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
