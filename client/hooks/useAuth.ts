import { create } from "zustand";
import type { User } from "@portfolio-tracker/shared";
import api, { saveToken, clearToken, getToken, setOnAuthFailure } from "../services/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authError: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),

  login: async (password: string) => {
    const { data } = await api.post("/auth/login", { password });
    await saveToken(data.data.token);
    set({ user: data.data.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Best effort
    }
    await clearToken();
    set({ user: null, isAuthenticated: false });
  },

  initialize: async () => {
    setOnAuthFailure(() => {
      set({ user: null, isAuthenticated: false, authError: "Session expired. Please sign in again." });
    });

    set({ isLoading: true });
    try {
      const token = await getToken();
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const { data } = await api.get("/auth/me");
      set({ user: data.data, isAuthenticated: true, isLoading: false });
    } catch {
      try {
        const { data: refreshData } = await api.post("/auth/refresh");
        await saveToken(refreshData.data.token);
        const { data: meData } = await api.get("/auth/me");
        set({ user: meData.data, isAuthenticated: true, isLoading: false });
      } catch {
        await clearToken();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    }
  },
}));
