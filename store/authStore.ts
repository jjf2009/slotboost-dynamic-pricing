import { create } from "zustand";

interface AuthState {
  user: Record<string, unknown> | null;
  setUser: (user: Record<string, unknown>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
