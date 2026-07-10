import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getAuthToken, setAuthToken } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((data) => {
    if (data?.token) setAuthToken(data.token);
    setUser(data?.user ?? null);
    setWallet(data?.wallet ?? null);
  }, []);

  const refresh = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setWallet(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.me();
      setUser(data.user);
      setWallet(data.wallet);
    } catch {
      setAuthToken(null);
      setUser(null);
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const register = useCallback(async (payload) => {
    const data = await api.register(payload);
    applySession(data);
    return data;
  }, [applySession]);

  const login = useCallback(async (payload) => {
    const data = await api.login(payload);
    applySession(data);
    return data;
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setAuthToken(null);
      setUser(null);
      setWallet(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, wallet, loading, register, login, logout, refresh }),
    [user, wallet, loading, register, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
