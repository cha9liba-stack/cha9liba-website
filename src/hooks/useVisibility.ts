import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";

const DB_URL = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

interface VisibilitySettings {
  showPrices: boolean;
  showStatistics: boolean;
  showDebt: boolean;
  showDriverCin: boolean;
  showDepotGarantie: boolean;
}

const DEFAULT: VisibilitySettings = {
  showPrices: true,
  showStatistics: true,
  showDebt: true,
  showDriverCin: true,
  showDepotGarantie: true,
};

let cache: VisibilitySettings | null = null;

export function useVisibility() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  const [vis, setVis] = useState<VisibilitySettings>(cache || DEFAULT);

  useEffect(() => {
    if (isAdmin) return; // admins always see everything
    if (cache) { setVis(cache); return; }
    fetch(`${DB_URL}/app_settings/visibility.json`)
      .then((r) => r.json())
      .then((data) => {
        const merged = { ...DEFAULT, ...data };
        cache = merged;
        setVis(merged);
      })
      .catch(() => {});
  }, [isAdmin]);

  // Admins always see everything
  if (isAdmin) return DEFAULT;
  return vis;
}
