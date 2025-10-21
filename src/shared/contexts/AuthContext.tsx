import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { AccountSummary } from '../types';

interface AuthContextValue {
  account: AccountSummary | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, account: AccountSummary) => void;
  logout: () => void;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_TOKEN_KEY = 'authToken';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(token));

  const applyToken = useCallback((newToken: string | null) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }, []);

  const refreshAccount = useCallback(async () => {
    if (!token) {
      setAccount(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const summary = await api.accounts.getMe();
      setAccount(summary);
    } catch (error) {
      console.error('Failed to refresh account information:', error);
      applyToken(null);
      setAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, [token, applyToken]);

  useEffect(() => {
    if (token) {
      refreshAccount();
    } else {
      setAccount(null);
      setIsLoading(false);
    }
  }, [token, refreshAccount]);

  const handleLogin = useCallback((newToken: string, summary: AccountSummary) => {
    applyToken(newToken);
    setAccount(summary);
  }, [applyToken]);

  const logout = useCallback(() => {
    applyToken(null);
    setAccount(null);
  }, [applyToken]);

  const value = useMemo(() => ({
    account,
    token,
    isLoading,
    login: handleLogin,
    logout,
    refreshAccount,
  }), [account, token, isLoading, handleLogin, logout, refreshAccount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
