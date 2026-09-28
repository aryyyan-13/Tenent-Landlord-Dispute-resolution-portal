import React, { createContext, useContext, useState, useCallback } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('tldrp_user');
      if (!stored || stored === 'undefined' || stored === 'null') return null;
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem('tldrp_user');
      localStorage.removeItem('tldrp_token');
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const persist = (token, user) => {
    if (!token || !user) {
      throw new Error('Invalid authentication response from backend.');
    }
    localStorage.setItem('tldrp_token', token);
    localStorage.setItem('tldrp_user', JSON.stringify(user));
    setUser(user);
  };

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { data } = await client.post('/auth/login', { email, password });
      if (!data || typeof data !== 'object' || !data.token || !data.user) {
        throw new Error('API server returned an invalid response. Ensure VITE_API_URL points to your live backend.');
      }
      persist(data.token, data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (formData) => {
    setLoading(true);
    try {
      const { data } = await client.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (!data || typeof data !== 'object' || !data.token || !data.user) {
        throw new Error('Registration succeeded, but response payload was invalid.');
      }
      persist(data.token, data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('tldrp_token');
    localStorage.removeItem('tldrp_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
