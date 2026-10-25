import React, { createContext, useContext, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

function persistSession(data) {
  localStorage.setItem('access_token', data.access);
  localStorage.setItem('refresh_token', data.refresh);
  const userInfo = { id: data.user_id, name: data.name, role: data.role };
  localStorage.setItem('obe_user', JSON.stringify(userInfo));
  return userInfo;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('obe_user');
    return saved ? JSON.parse(saved) : null;
  });

  async function login(username, password) {
    const { data } = await api.post('/auth/login/', { username, password });
    const userInfo = persistSession(data);
    setUser(userInfo);
    return userInfo;
  }

  async function signup(payload) {
    const { data } = await api.post('/auth/signup/', payload);
    const userInfo = persistSession(data);
    setUser(userInfo);
    return userInfo;
  }

  async function logout() {
    const refresh = localStorage.getItem('refresh_token');
    try {
      if (refresh) {
        await api.post('/auth/logout/', { refresh });
      }
    } catch {
      // Token may already be invalid; still clear local session.
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('obe_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAdmin: user?.role === 'ADMIN' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
