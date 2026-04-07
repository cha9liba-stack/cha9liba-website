import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types";

export interface Branch {
  id: string;
  name: string;
}

interface AuthState {
  user: (User & { firebaseId: string }) | null;
  setUser: (user: (User & { firebaseId: string }) | null) => void;
  logout: () => void;
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, selectedBranch: null }),
      selectedBranch: null,
      setSelectedBranch: (selectedBranch) => set({ selectedBranch }),
    }),
    { name: "auth-store" }
  )
);
