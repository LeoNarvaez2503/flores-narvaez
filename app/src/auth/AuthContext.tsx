/**
 * Contexto de autenticación de la app, conectado al backend real
 * (NestJS + PostgreSQL): `POST /auth/login` y `POST /auth/register`.
 * Guarda el JWT en el cliente HTTP para las llamadas autenticadas.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ApiError, apiFetch, setAuthToken } from '../api/client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  membershipTier: string;
}

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

interface Result {
  ok: boolean;
  error?: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Result>;
  register: (name: string, email: string, password: string) => Promise<Result>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);

  const handle = useCallback(async (path: string, body: unknown): Promise<Result> => {
    setLoading(true);
    try {
      const res = await apiFetch<AuthResponse>(path, { method: 'POST', body });
      setAuthToken(res.accessToken);
      setUser(res.user);
      return { ok: true };
    } catch (e) {
      const error = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado.';
      return { ok: false, error };
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    (email: string, password: string) => handle('/auth/login', { email, password }),
    [handle],
  );

  const register = useCallback(
    (name: string, email: string, password: string) => handle('/auth/register', { name, email, password }),
    [handle],
  );

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
