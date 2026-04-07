import { useState, useEffect } from "react";

const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

// Returns a Set of normalized registrations belonging to sous-traitants
export function useSousTraitantCars(): Set<string> {
  const [stRegs, setStRegs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`${DB}/sous_traitants.json`)
      .then(r => r.json())
      .then(data => {
        if (!data) return;
        const regs = new Set<string>();
        for (const st of Object.values(data) as any[]) {
          for (const car of (st.cars || [])) {
            regs.add((car.registration || "").replace(/\s+/g, "").toUpperCase());
          }
        }
        setStRegs(regs);
      }).catch(() => {});
  }, []);

  return stRegs;
}
