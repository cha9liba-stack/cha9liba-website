import { useEffect, useMemo } from "react";
import { useContractStore } from "../store/useContractStore";
import type { Contract } from "../types";

function norm(s: string) { return String(s || "").replace(/\s+/g, "").toUpperCase(); }
function today() { return new Date().toISOString().split("T")[0]; }

export function useFleetStats() {
  const contracts = useContractStore(s => s.contracts);
  const setFleetStats = useContractStore(s => s.setFleetStats);

  const stats = useMemo(() => {
    const t = today();
    const now = new Date();
    const nowDT = t + " " + String(now.getHours()).padStart(2,"0") + ":" + String(now.getMinutes()).padStart(2,"0");

    let fleetCars: { registration: string }[] = [];
    try {
      const saved = localStorage.getItem("palma_fleet_cars");
      if (saved) fleetCars = JSON.parse(saved);
    } catch {}

    const overrides: Record<string, string> = {};
    try {
      const raw = JSON.parse(localStorage.getItem("palma_state_overrides") || "{}");
      for (const [reg, entries] of Object.entries(raw) as any) {
        let entry: any = null;
        if (Array.isArray(entries)) {
          entry = [...entries].reverse().find((e: any) => e.from <= t && (e.to === null || e.to === undefined || e.to >= t));
        } else if (entries && typeof entries === "object") {
          entry = entries;
        }
        if (entry) overrides[norm(reg)] = entry.state;
      }
    } catch {}

    // Active contracts today — deduplicated by registration
    const active = contracts.filter(c => c.departureDate && c.returnDate && c.departureDate <= t && c.returnDate >= t && !c._deleted);
    const activeMap = new Map<string, Contract>();
    for (const c of active) {
      const key = norm(c.registration || "");
      const ex = activeMap.get(key);
      if (!ex || c.departureDate > ex.departureDate) activeMap.set(key, c);
    }

    let rented = 0, late = 0, available = 0, maintenance = 0;
    const lateContracts: Contract[] = [];

    for (const car of fleetCars) {
      const key = norm(car.registration);
      const override = overrides[key];
      if (override === "available")   { available++;   continue; }
      if (override === "maintenance") { maintenance++; continue; }
      if (override) continue;

      const contract = activeMap.get(key);
      if (contract) {
        const retDT = contract.returnDate + " " + (contract.returnTime || "23:59");
        if (retDT < nowDT || contract.returnDate < t) {
          late++;
          lateContracts.push(contract);
        } else {
          rented++;
        }
        continue;
      }
      available++;
    }

    return { rented, late, available, maintenance, lateContracts };
  }, [contracts]);

  useEffect(() => {
    setFleetStats(stats);
  }, [stats]);
}
