export interface User {
  id: string;
  etoroUserId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface LoginRequest {
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
