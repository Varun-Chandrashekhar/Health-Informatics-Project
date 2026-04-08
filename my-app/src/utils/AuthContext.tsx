"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';

interface AuthUser {
  userId: string;
  condition: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (userId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cbt_auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      }
    } catch {
      localStorage.removeItem('cbt_auth');
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (userId: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_id, password, assigned_condition, is_admin')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return { success: false, error: 'User not found.' };
      }

      if (data.password !== password && data.password !== btoa(password)) {
        return { success: false, error: 'Incorrect password.' };
      }

      const authUser: AuthUser = {
        userId: data.user_id,
        condition: data.assigned_condition || 'control',
        isAdmin: data.is_admin || false,
      };

      setUser(authUser);
      localStorage.setItem('cbt_auth', JSON.stringify(authUser));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed.' };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('cbt_auth');
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
