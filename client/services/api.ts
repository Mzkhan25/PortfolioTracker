import axios from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

function getBaseUrl(): string {
  if (!__DEV__) return "https://portfolio-trackerserver-production.up.railway.app";
  // Web and iOS simulator can use localhost
  if (Platform.OS === "web" || Platform.OS === "ios") return "http://localhost:3000";
  // Android emulator maps 10.0.2.2 to host machine's localhost
  return "http://10.0.2.2:3000";
}

const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

// Callback for when auth fails completely — set by useAuth on init
let onAuthFailure: (() => void) | null = null;

export function setOnAuthFailure(callback: () => void) {
  onAuthFailure = callback;
}

// Attach JWT to every request
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const response = await api.post("/auth/refresh");
        const { token } = response.data.data;
        await saveToken(token);
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch {
        await clearToken();
        onAuthFailure?.();
      }
    }
    throw error;
  }
);

async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem("jwt_token");
  }
  return SecureStore.getItemAsync("jwt_token");
}

async function saveToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem("jwt_token", token);
    return;
  }
  await SecureStore.setItemAsync("jwt_token", token);
}

async function clearToken(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem("jwt_token");
    return;
  }
  await SecureStore.deleteItemAsync("jwt_token");
}

export { api, saveToken, clearToken, getToken };
export default api;
