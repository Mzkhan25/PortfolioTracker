import { create } from "zustand";
import type { User } from "@portfolio-tracker/shared";
import api, { saveToken, clearToken, getToken, setOnAuthFailure } from "../services/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  login: (apiKey: string, userKey: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),

  login: async (apiKey: string, userKey: string) => {
    const { data } = await api.post("/auth/login", { apiKey, userKey });
    await saveToken(data.data.token);
    set({ user: data.data.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Best effort — clear local state regardless
    }
    await clearToken();
    set({ user: null, isAuthenticated: false });
  },

  initialize: async () => {
    // Register callback so API interceptor can clear auth on failed refresh
    setOnAuthFailure(() => {
      set({ user: null, isAuthenticated: false });
    });

    set({ isLoading: true });
    try {
      const token = await getToken();
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      // Validate token by fetching user profile
      const { data } = await api.get("/auth/me");
      set({ user: data.data, isAuthenticated: true, isLoading: false });
    } catch {
      // Token invalid or expired — try refresh
      try {
        const { data: refreshData } = await api.post("/auth/refresh");
        await saveToken(refreshData.data.token);
        const { data: meData } = await api.get("/auth/me");
        set({ user: meData.data, isAuthenticated: true, isLoading: false });
      } catch {
        // Refresh also failed — clear everything
        await clearToken();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    }
  },
}));
