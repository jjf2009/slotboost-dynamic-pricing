import { create } from "zustand";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "professional" | "client";
}

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
