import { create } from "zustand";
import type { Contract } from "../types";

export interface FleetStats {
  rented: number;
  late: number;
  available: number;
  maintenance: number;
  lateContracts: Contract[];
}

interface ContractState {
  contracts: Contract[];
  setContracts: (contracts: Contract[]) => void;
  upsertContract: (contract: Contract) => void;
  removeContract: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  fleetStats: FleetStats;
  setFleetStats: (stats: FleetStats) => void;
}

export const useContractStore = create<ContractState>((set) => ({
  contracts: [],
  setContracts: (contracts) => set({ contracts }),
  upsertContract: (contract) =>
    set((state) => {
      const idx = state.contracts.findIndex((c) => c.id === contract.id);
      if (idx >= 0) {
        const updated = [...state.contracts];
        updated[idx] = contract;
        return { contracts: updated };
      }
      return { contracts: [contract, ...state.contracts] };
    }),
  removeContract: (id) =>
    set((state) => ({ contracts: state.contracts.filter((c) => c.id !== id) })),
  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  fleetStats: { rented: 0, late: 0, available: 0, maintenance: 0, lateContracts: [] },
  setFleetStats: (fleetStats) => set({ fleetStats }),
}));
