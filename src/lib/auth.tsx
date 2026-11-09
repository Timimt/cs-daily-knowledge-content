import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthSessionResponse } from "../shared/admin-types";
import { apiFetch } from "./api";

type AuthContextValue = {
  loading: boolean;
  configured: boolean;
  authenticated: boolean;
  expiresAt: string | null;
  required: string[];
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSessionResponse>({
    configured: false,
    authenticated: false,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await apiFetch<AuthSessionResponse>("/api/auth/session");
      setSession(next);
    } catch {
      setSession({ configured: false, authenticated: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (password: string) => {
      const result = await apiFetch<{ authenticated: boolean; expiresAt: string }>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ password }),
        },
      );
      setSession({
        configured: true,
        authenticated: result.authenticated,
        expiresAt: result.expiresAt,
      });
    },
    [],
  );

  const logout = useCallback(async () => {
    await apiFetch<{ authenticated: boolean }>("/api/auth/logout", {
      method: "POST",
    });
    setSession((current) => ({
      ...current,
      authenticated: false,
      expiresAt: null,
    }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      configured: session.configured,
      authenticated: session.authenticated,
      expiresAt: session.expiresAt ?? null,
      required: session.required ?? [],
      login,
      logout,
      refresh,
    }),
    [loading, session, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
