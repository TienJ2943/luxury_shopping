import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, clearStoredAuth, getStoredUser, setStoredAuth } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const refreshUser = async () => {
      if (!localStorage.getItem('matcha_token')) return;
      try {
        const data = await apiFetch('/api/auth/me');
        setUser(data.user);
        localStorage.setItem('matcha_user', JSON.stringify(data.user));
      } catch {
        clearStoredAuth();
        setUser(null);
      }
    };
    refreshUser();
  }, []);

  async function updateAccount(formData) {
  const data = await apiFetch('/api/auth/me', {
    method: 'PUT',
    body: JSON.stringify(formData),
  });

  setUser(data.user);
  setStoredAuth(data.token, data.user);

  return data;
}

  async function register(formData) {
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setStoredAuth(data.token, data.user);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }

  async function login(formData) {
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setStoredAuth(data.token, data.user);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearStoredAuth();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, updateAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
