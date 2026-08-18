import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import apiClient from "../api/client";
import {
  beginAuthInitialization,
  clearClientSession,
  getAuthSnapshot,
  setAccessToken,
  setAuthenticatedSession,
  subscribeToAuth,
  type AuthSnapshot,
  type CurrentUser,
} from "./authStore";

interface TokenResponse {
  accessToken: string;
  expiresIn: number;
}

interface AuthActions {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export type AuthContextValue = AuthSnapshot & AuthActions;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeToAuth, getAuthSnapshot, getAuthSnapshot);
  const bootstrapStarted = useRef(false);

  useEffect(() => {
    if (bootstrapStarted.current) return;
    bootstrapStarted.current = true;
    beginAuthInitialization();

    void restoreSession();
  }, []);

  const actions = useMemo<AuthActions>(() => ({
    async login(username, password) {
      const response = await apiClient.post<TokenResponse>(
        "/api/v1/auth/login",
        { username, password },
        { withCredentials: true, skipAuthRefresh: true },
      );
      await establishSession(response.data.accessToken);
    },

    async register(username, email, password) {
      await apiClient.post(
        "/api/v1/auth/register",
        { username, email, password },
        { skipAuthRefresh: true },
      );
    },

    async logout() {
      try {
        await apiClient.post("/api/v1/auth/logout", undefined, { withCredentials: true });
      } finally {
        clearClientSession();
      }
    },
  }), []);

  const value = useMemo<AuthContextValue>(() => ({ ...snapshot, ...actions }), [snapshot, actions]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  const snapshot = useSyncExternalStore(subscribeToAuth, getAuthSnapshot, getAuthSnapshot);

  if (context) return context;

  return {
    ...snapshot,
    login: async () => { throw new Error("AuthProvider is required for login."); },
    register: async () => { throw new Error("AuthProvider is required for registration."); },
    logout: async () => { clearClientSession(); },
  };
}

async function restoreSession() {
  try {
    const response = await apiClient.post<TokenResponse>(
      "/api/v1/auth/refresh",
      undefined,
      { withCredentials: true, skipAuthRefresh: true },
    );
    await establishSession(response.data.accessToken);
  } catch {
    clearClientSession();
  }
}

async function establishSession(accessToken: string) {
  setAccessToken(accessToken);
  try {
    const response = await apiClient.get<CurrentUser>("/api/v1/auth/me");
    setAuthenticatedSession(accessToken, response.data);
  } catch (error: unknown) {
    clearClientSession();
    throw error;
  }
}
