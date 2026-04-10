import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Plus, Trash2, Car, Wrench, CalendarClock, AlertCircle, Bell, X, MessageSquare, Globe, Check } from "lucide-react";
import { useContractStore } from "../store/useContractStore";
import { useAuthStore } from "../store/useAuthStore";
import { isSousTraitant } from "../lib/permissions";
import type { Contract, MaintenanceCar, Reservation, UnpaidRecord } from "../types";
import SMSComposeModal from "../components/SMS/SMSComposeModal";
// ─── localStorage ─────────────────────────────────────────────────────────────
function load<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function save<T>(key: string, d: T[]) { localStorage.setItem(key, JSON.stringify(d)); }
const K = { maint: "palma_maint", res: "palma_res", unpaid: "palma_unpaid" };

// Last contract per car (persisted so it shows after contract ends)
const LAST_CONTRACTS_KEY = "palma_last_contracts";
function loadLastContracts(): Record<string, Contract> {
  try { return JSON.parse(localStorage.getItem(LAST_CONTRACTS_KEY) || "{}"); } catch { return {}; }
}
function saveLastContracts(d: Record<string, Contract>) {
  localStorage.setItem(LAST_CONTRACTS_KEY, JSON.stringify(d));
}

// Manual state overrides per car — historical: each entry has from/to dates
const OVERRIDES_KEY = "palma_state_overrides";
const DB_URL_FLEET = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

async function fbSaveOverrides(d: OverrideHistory) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(d));
  try {
    await fetch(`${DB_URL_FLEET}/app_settings/overrides.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });
  } catch {}
}

async function fbLoadOverrides(): Promise<OverrideHistory | null> {
  try {
    const res = await fetch(`${DB_URL_FLEET}/app_settings/overrides.json`);
    if (res.ok) { const d = await res.json(); return d; }
  } catch {}
  return null;
}
type BuiltinOverride = "available" | "maintenance";
type CarOverride = BuiltinOverride | string; // string = custom state id

// Historical override entry
interface OverrideEntry {
  state: CarOverride;
  from: string;  // YYYY-MM-DD
  to: string | null; // null = still active
}

// Storage format: { [normReg]: OverrideEntry[] }
type OverrideHistory = Record<string, OverrideEntry[]>;

function loadOverrideHistory(): OverrideHistory {
  // Don't load from localStorage — always wait for Firebase sync
  // This prevents stale overrides from blocking active contracts
  return {};
}
function saveOverrideHistory(d: OverrideHistory) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(d));
  fbSaveOverrides(d);
}

// Get the active override for a car on a given date
function getOverrideOnDate(history: OverrideHistory, reg: string, date: string): CarOverride | null {
  const entries = history[norm(reg)] || [];
  const entry = [...entries].reverse().find(e => e.from <= date && (e.to === null || e.to === undefined || e.to >= date));
  return entry ? entry.state : null;
}

// Set a new override for a car starting from today, closing the previous one
function setOverrideEntry(history: OverrideHistory, reg: string, state: CarOverride | null, date: string): OverrideHistory {
  const key = norm(reg);
  const entries = [...(history[key] || [])];
  const activeIdx = entries.findIndex(e => e.to === null || e.to === undefined);
  if (activeIdx >= 0) {
    entries[activeIdx] = { ...entries[activeIdx], to: addDaysStr(date, -1) };
  }
  const next = { ...history, [key]: entries };
  if (state !== null) {
    next[key] = [...entries, { state, from: date, to: null }];
  }
  return next;
}

function addDaysStr(date: string, n: number): string {
  const d = new Date(date); d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

// Build flat "current overrides" map for a given date (used by fleetStatus)
function buildOverridesForDate(history: OverrideHistory, date: string): Record<string, CarOverride> {
  const result: Record<string, CarOverride> = {};
  for (const [reg, entries] of Object.entries(history)) {
    const entry = [...entries].reverse().find(e => e.from <= date && (e.to === null || e.to === undefined || e.to >= date));
    if (entry) result[reg] = entry.state;
  }
  return result;
}

// Custom states registry
const CUSTOM_STATES_KEY = "palma_custom_states";
export interface CustomCarState {
  id: string;
  label: string;
  color: string;   // hex color
  bgClass: string; // tailwind bg for row
}
function loadCustomStates(): CustomCarState[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_STATES_KEY) || "[]"); } catch { return []; }
}
function saveCustomStates(d: CustomCarState[]) {
  localStorage.setItem(CUSTOM_STATES_KEY, JSON.stringify(d));
  // Sync to Firebase
  fetch(`${DB_URL_FLEET}/app_settings/custom_states.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(d),
  }).catch(() => {});
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split("T")[0]; }
function addDays(date: string, n: number) {
  const d = new Date(date); d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}
function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}
function norm(s: string): string {
  return String(s || "").replace(/\s+/g, "").toUpperCase();
}
function isActiveOnDate(dep: string, ret: string, date: string) {
  return dep <= date && ret >= date;
}
// Format: YYYY-MM-DD → DD-MM-YYYY
function fmtDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}-${m}-${y}`;
}

// ─── Small field input ────────────────────────────────────────────────────────
function F({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, onSave, children }: {
  title: string; onClose: () => void; onSave: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">{children}</div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">إلغاء</button>
          <button onClick={onSave} className="px-4 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg">حفظ</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Fleet() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const contracts = useContractStore(s => s.contracts);
  const setFleetStats = useContractStore(s => s.setFleetStats);
  const user = useAuthStore(s => s.user);
  const isST = isSousTraitant(user);

  const [date, setDate] = useState(today);
  const [maint, setMaint] = useState<MaintenanceCar[]>(() => load(K.maint));
  const [res, setRes] = useState<Reservation[]>(() => load(K.res));
  const [unpaid, setUnpaid] = useState<UnpaidRecord[]>(() => load(K.unpaid));
  const [modal, setModal] = useState<"maint" | "res" | "unpaid" | null>(null);
  const [overrides, setOverrides] = useState<Record<string, CarOverride>>(() =>
    buildOverridesForDate(loadOverrideHistory(), today())
  );
  const [overrideHistory, setOverrideHistory] = useState<OverrideHistory>(loadOverrideHistory);
  const [stateMenu, setStateMenu] = useState<string | null>(null);
  const [statsModal, setStatsModal] = useState<"retour" | "retard" | "rented" | "available" | "maintenance" | "reserved" | string | null>(null);
  const [smsContract, setSmsContract] = useState<Contract | null>(null);
  const [customStates, setCustomStates] = useState<CustomCarState[]>(loadCustomStates);
  const [showCustomStateModal, setShowCustomStateModal] = useState(false);
  const [newStateName, setNewStateName] = useState("");
  const [newStateColor, setNewStateColor] = useState("#f59e0b");

  const PRESET_COLORS = ["#f59e0b","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316","#64748b","#84cc16"];

  function saveCustomState() {
    if (!newStateName.trim()) return;
    const id = "custom_" + Date.now();
    // Pick a light bg based on color — store as inline style
    const next: CustomCarState = { id, label: newStateName.trim(), color: newStateColor, bgClass: "" };
    const updated = [...customStates, next];
    setCustomStates(updated);
    saveCustomStates(updated);
    setNewStateName("");
    setNewStateColor("#f59e0b");
    setShowCustomStateModal(false);
  }

  function deleteCustomState(id: string) {
    const updated = customStates.filter(s => s.id !== id);
    setCustomStates(updated);
    saveCustomStates(updated);
    // Remove overrides using this state from history
    const newHistory = { ...overrideHistory };
    for (const key of Object.keys(newHistory)) {
      newHistory[key] = newHistory[key].filter(e => e.state !== id);
    }
    setOverrideHistory(newHistory);
    saveOverrideHistory(newHistory);
    setOverrides(buildOverridesForDate(newHistory, date));
  } // registration of car with open menu

  useEffect(() => { save(K.maint, maint); }, [maint]);
  useEffect(() => { save(K.res, res); }, [res]);
  useEffect(() => { save(K.unpaid, unpaid); }, [unpaid]);

  // Sync overrides and custom states from Firebase on mount and every 15s
  useEffect(() => {
    function syncFromFirebase() {
      fbLoadOverrides().then(data => {
        if (!data) return;
        const migrated: OverrideHistory = {};
        for (const [key, val] of Object.entries(data)) {
          if (typeof val === "string") {
            migrated[key] = [{ state: val as CarOverride, from: "2020-01-01", to: null }];
          } else if (Array.isArray(val)) {
            migrated[key] = val as OverrideEntry[];
          } else if (val && typeof val === "object") {
            migrated[key] = [val as OverrideEntry];
          }
        }
        // Firebase always wins — overwrite localStorage
        localStorage.setItem(OVERRIDES_KEY, JSON.stringify(migrated));
        setOverrideHistory(migrated);
      });
      // Sync custom states
      fetch(`${DB_URL_FLEET}/app_settings/custom_states.json`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            localStorage.setItem(CUSTOM_STATES_KEY, JSON.stringify(data));
            setCustomStates(data);
          }
        }).catch(() => {});
    }
    syncFromFirebase();
    const interval = setInterval(syncFromFirebase, 15000);
    return () => clearInterval(interval);
  }, []);

  // Persist last contract per car whenever contracts change
  useEffect(() => {
    if (contracts.length === 0) return;
    const updated = { ...loadLastContracts() };
    for (const c of contracts) {
      if (!c.registration) continue;
      const key = norm(c.registration);
      const existing = updated[key];
      if (!existing || c.departureDate > existing.departureDate) {
        updated[key] = c;
      }
    }
    saveLastContracts(updated);
  }, [contracts]);

  // Recompute overrides when date changes
  useEffect(() => {
    setOverrides(buildOverridesForDate(overrideHistory, date));
  }, [date, overrideHistory]);

  function setCarOverride(registration: string, state: CarOverride | null) {
    const newHistory = setOverrideEntry(overrideHistory, registration, state, date);
    setOverrideHistory(newHistory);
    saveOverrideHistory(newHistory);
    setOverrides(buildOverridesForDate(newHistory, date));
    setStateMenu(null);
  }

  // ── Deduplicate by registration — keep only the LATEST active contract per car ──
  const rentedCars = useMemo(() => {
    const active = contracts.filter(c =>
      c.departureDate && c.returnDate && isActiveOnDate(c.departureDate, c.returnDate, date)
    );
    // Group by registration, keep most recent departure
    const map = new Map<string, Contract>();
    for (const c of active) {
      const key = c.registration?.trim().toUpperCase() || c.id!;
      const existing = map.get(key);
      if (!existing || c.departureDate > existing.departureDate) {
        map.set(key, c);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.registration.localeCompare(b.registration));
  }, [contracts, date]);

  // ── Last contract per car BEFORE or ON the selected date ──
  const lastContractsOnDate = useMemo(() => {
    const map: Record<string, Contract> = {};
    for (const c of contracts) {
      if (!c.registration || !c.departureDate) continue;
      // Only consider contracts that started on or before the selected date
      if (c.departureDate > date) continue;
      const key = norm(c.registration);
      const existing = map[key];
      if (!existing || c.departureDate > existing.departureDate) {
        map[key] = c;
      }
    }
    return map;
  }, [contracts, date]);

  const maintOnDate = useMemo(() =>
    maint.filter(m => m.entryDate <= date && (!m.exitDate || m.exitDate === "" || m.exitDate >= date)),
    [maint, date]
  );
  const resOnDate = useMemo(() =>
    res.filter(r => r.startDate <= date && r.endDate >= date),
    [res, date]
  );

  // ── Fleet registry: user-managed list of owned cars ──
  const [fleetCars, setFleetCars] = useState<{registration: string; brand: string; model: string}[]>(
    () => {
      try {
        const saved = localStorage.getItem("palma_fleet_cars");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.length > 0) return parsed;
        }
      } catch {}
      return DEFAULT_FLEET;
    }
  );
  const [showFleetManager, setShowFleetManager] = useState(false);

  useEffect(() => {
    localStorage.setItem("palma_fleet_cars", JSON.stringify(fleetCars));
  }, [fleetCars]);

  // ── Fleet = user-managed list ──────────────────────────────────────────────
  const allCars = useMemo(() => fleetCars, [fleetCars]);

  const maintRegs  = useMemo(() => new Set(maintOnDate.map(m => norm(m.registration || ""))), [maintOnDate]);

  // ── Fleet status: each car with its current state ──
  type CarState = "rented" | "late" | "maintenance" | "available" | "custom";

  // Build a set of date ranges per car where a contract was active — override is invalid during these
  const contractRanges = useMemo(() => {
    const map: Record<string, { dep: string; ret: string }[]> = {};
    for (const c of contracts) {
      if (!c.registration || !c.departureDate || !c.returnDate) continue;
      const key = norm(c.registration);
      if (!map[key]) map[key] = [];
      map[key].push({ dep: c.departureDate, ret: c.returnDate });
    }
    return map;
  }, [contracts]);

  const fleetStatus = useMemo(() => {
    return allCars.map(car => {
      const key = norm(car.registration);
      const contract = rentedCars.find(c => norm(c.registration || "") === key) || null;
      const lastC = lastContractsOnDate[key] || null;

      // User override — contract wins ONLY if override was set BEFORE contract started
      const override = overrides[key];

      if (contract) {
        // If override exists and was set after departure, override wins (manual early return)
        const overrideEntry = [...(overrideHistory[key] || [])].reverse()
          .find(e => e.from <= date && (e.to === null || e.to === undefined || e.to >= date));
        const overrideSetAfterDeparture = overrideEntry && overrideEntry.from >= contract.departureDate;

        // If override exists and was set after departure, it always wins
        if (override && overrideSetAfterDeparture) {
          if (override === "available") return { ...car, state: "available" as CarState, contract };
          if (override === "maintenance") return { ...car, state: "maintenance" as CarState, contract };
          return { ...car, state: "custom" as CarState, contract, customStateId: override };
        }

        // No override or override was set before contract → contract wins
        // For today, check time; for historical dates, just check date
        let isLate: boolean;
        if (date === today()) {
          const returnDateTime = contract.returnDate + (contract.returnTime ? " " + contract.returnTime : " 23:59");
          const nowDateTime = date + " " + String(new Date().getHours()).padStart(2,"0") + ":" + String(new Date().getMinutes()).padStart(2,"0");
          isLate = returnDateTime < nowDateTime;
        } else {
          // Historical date: check if return date is before selected date
          isLate = contract.returnDate < date;
        }
        return { ...car, state: (isLate ? "late" : "rented") as CarState, contract };
      }

      // No active contract — apply override
      if (override === "available")   return { ...car, state: "available"   as CarState, contract: lastC };
      if (override === "maintenance") return { ...car, state: "maintenance" as CarState, contract: lastC };
      if (override)                   return { ...car, state: "custom"      as CarState, contract: lastC, customStateId: override };

      // Maintenance from maint list
      if (maintRegs.has(key)) return { ...car, state: "maintenance" as CarState, contract: lastC };

      return { ...car, state: "available" as CarState, contract: lastC };
    });
  }, [allCars, rentedCars, maintRegs, date, overrides, overrideHistory, lastContractsOnDate, contractRanges]);

  const fleetStatusSorted = useMemo(() => {
    return [...fleetStatus].sort((a, b) => {
      const ta = (a.contract?.returnDate || "9999") + " " + (a.contract?.returnTime || "00:00");
      const tb = (b.contract?.returnDate || "9999") + " " + (b.contract?.returnTime || "00:00");
      return ta.localeCompare(tb);
    });
  }, [fleetStatus]);

  // Sync fleet stats to store so Dashboard can read them
  useEffect(() => {
    setFleetStats({
      rented:      fleetStatus.filter(c => c.state === "rented").length,
      late:        fleetStatus.filter(c => c.state === "late").length,
      available:   fleetStatus.filter(c => c.state === "available").length,
      maintenance: fleetStatus.filter(c => c.state === "maintenance").length,
    });
  }, [fleetStatus]);

  // ── Return alerts: cars returning today ───────────────────────────────────
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem("palma_dismissed_alerts") || "[]")); }
    catch { return new Set(); }
  });
  const [alertModalOpen, setAlertModalOpen] = useState(false);

  // Online bookings from website
  const DB_BOOKINGS = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";
  const [onlineBookings, setOnlineBookings] = useState<any[]>([]);
  const [onlineBookingsLoading, setOnlineBookingsLoading] = useState(true);

  useEffect(() => {
    setOnlineBookingsLoading(true);
    fetch(`${DB_BOOKINGS}/bookings.json`)
      .then(r => r.json())
      .then(data => {
        if (data) {
          const list = Object.entries(data)
            .map(([id, v]: any) => ({ ...v, id }))
            .filter((b: any) => b.status === "pending")
            .sort((a: any, b: any) => b._createdAt - a._createdAt);
          setOnlineBookings(list);
        }
      }).catch(() => {})
      .finally(() => setOnlineBookingsLoading(false));
  }, []);

  async function updateBookingStatus(id: string, status: "confirmed" | "rejected") {
    const booking = onlineBookings.find(b => b.id === id);
    await fetch(`${DB_BOOKINGS}/bookings/${id}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, _updatedAt: Date.now() }),
    }).catch(() => {});

    // If confirmed → add to local reservations list
    if (status === "confirmed" && booking) {
      const newRes: Reservation = {
        id: `online_${id}`,
        clientName: booking.clientName,
        phone: booking.clientPhone || "",
        startDate: booking.startDate,
        endDate: booking.endDate,
        brand: `${booking.brand} ${booking.model}`,
        registration: booking.registration || "",
        notes: booking.notes || `Réservation en ligne · ${booking.clientEmail || ""}`,
        advance: booking.depositAmount ? String(booking.depositAmount) : "0",
      };
      setRes(prev => {
        const updated = [...prev, newRes];
        save(K.res, updated);
        return updated;
      });
    }

    setOnlineBookings(prev => prev.filter(b => b.id !== id));
  }
  const [now, setNow] = useState(() => new Date());

  // Tick every minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const todayStr = now.toISOString().split("T")[0];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Cars returning today (for orange highlight from 08:00)
  const returningToday = useMemo(() =>
    rentedCars.filter(c => c.returnDate === todayStr),
    [rentedCars, todayStr]
  );

  // Cars to alert: returning today, within 2h, not dismissed
  const alertCars = useMemo(() => {
    if (date !== todayStr) return [];
    return returningToday.filter(c => {
      const key = c.id || c.contractNumber;
      if (dismissedAlerts.has(key)) return false;
      if (!c.returnTime) return false;
      const [h, m] = c.returnTime.split(":").map(Number);
      const returnMinutes = h * 60 + m;
      const diff = returnMinutes - nowMinutes;
      return diff >= 0 && diff <= 120;
    });
  }, [returningToday, nowMinutes, dismissedAlerts, date, todayStr]);

  // Auto-open modal when alert cars appear
  useEffect(() => {
    if (alertCars.length > 0) setAlertModalOpen(true);
  }, [alertCars.length]);

  function dismissAllAlerts() {
    const next = new Set(dismissedAlerts);
    alertCars.forEach(c => next.add(c.id || c.contractNumber));
    setDismissedAlerts(next);
    sessionStorage.setItem("palma_dismissed_alerts", JSON.stringify([...next]));
    setAlertModalOpen(false);
  }

  return (
    <div className="p-5 space-y-5" dir={isRTL ? "rtl" : "ltr"} onClick={() => setStateMenu(null)}>

      {/* ── Return alerts — modal popup ── */}
      {alertModalOpen && alertCars.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-orange-100 bg-orange-50 rounded-t-2xl">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell size={20} className="text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800">Retour imminent</p>
                <p className="text-xs text-orange-600">{alertCars.length} véhicule{alertCars.length > 1 ? "s" : ""} à récupérer dans moins de 2h</p>
              </div>
              <button onClick={() => setAlertModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {alertCars.map(c => {
                const [h, m] = (c.returnTime || "00:00").split(":").map(Number);
                const diff = (h * 60 + m) - nowMinutes;
                return (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Car size={18} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{c.brand} {c.model}</p>
                      <p className="text-xs font-mono text-slate-500">{c.registration}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{c.driverName} · {c.driverPhone}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-orange-600">{c.returnTime}</p>
                      <p className="text-xs text-slate-400">dans {diff}min</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
              <button onClick={() => setAlertModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                Rappeler plus tard
              </button>
              <button onClick={dismissAllAlerts}
                className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium">
                Compris, ne plus afficher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-bold text-slate-800">
          {isRTL ? "إدارة الأسطول" : "Gestion de la flotte"}
        </h1>
        {/* Date navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFleetManager(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
          >
            <Car size={13} />
            {isRTL ? `إدارة الأسطول (${allCars.length})` : `Gérer la flotte (${allCars.length})`}
          </button>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <button onClick={() => setDate(d => addDays(d, -1))} className="p-1 hover:bg-slate-100 rounded">
            <ChevronLeft size={15} />
          </button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="text-sm font-semibold text-slate-700 border-none outline-none bg-transparent w-36 text-center" />
          <button onClick={() => setDate(d => addDays(d, 1))} className="p-1 hover:bg-slate-100 rounded">
            <ChevronRight size={15} />
          </button>
          {date !== today() && (
            <button onClick={() => setDate(today())}
              className="text-xs text-amber-600 hover:underline px-1">
              {isRTL ? "اليوم" : "Auj."}
            </button>
          )}
        </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: isRTL ? "مكراة" : "Louées",      n: fleetStatus.filter(c => c.state === "rented" || c.state === "late").length, color: "bg-slate-800",  Icon: Car,          key: "rented" },
          { label: isRTL ? "متاحة" : "Disponibles", n: fleetStatus.filter(c => c.state === "available").length,                    color: "bg-green-500",  Icon: Car,          key: "available" },
          { label: isRTL ? "صيانة" : "En panne",    n: fleetStatus.filter(c => c.state === "maintenance").length,                  color: "bg-purple-500", Icon: Wrench,       key: "maintenance" },
          { label: isRTL ? "محجوزة" : "Réservées",  n: resOnDate.length,                                                           color: "bg-amber-500",  Icon: CalendarClock,key: "reserved" },
          { label: isRTL ? "رجوع اليوم" : "Retour auj.", n: fleetStatus.filter(c => c.contract?.returnDate === todayStr && (c.state === "rented" || c.state === "late")).length, color: "bg-orange-400", Icon: Bell, key: "retour" },
          { label: isRTL ? "متأخرة" : "Retard",     n: fleetStatus.filter(c => c.state === "late").length,                        color: "bg-red-500",    Icon: AlertCircle,  key: "retard" },
        ].map(({ label, n, color, Icon, key }) => (
          <div key={label}
            onClick={() => setStatsModal(key)}
            className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 min-w-[130px] cursor-pointer hover:shadow-md hover:border-slate-200 transition-all">
            <div className={`${color} rounded-lg p-2`}><Icon size={16} className="text-white" /></div>
            <div><p className="text-xl font-bold text-slate-800">{n}</p><p className="text-xs text-slate-500">{label}</p></div>
          </div>
        ))}
        {/* Custom states */}
        {customStates.map(cs => {
          const count = fleetStatus.filter(c => (c as any).customStateId === cs.id).length;
          return (
            <div key={cs.id} onClick={() => setStatsModal(cs.id)}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 min-w-[130px] cursor-pointer hover:shadow-md hover:border-slate-200 transition-all">
              <div className="rounded-lg p-2" style={{ backgroundColor: cs.color }}>
                <Car size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">{count}</p>
                <p className="text-xs text-slate-500">{cs.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 flex-wrap text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-black inline-block"/>{isRTL ? "مكترية حالياً" : "En cours"}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block"/>{isRTL ? "تجاوز وقت الرجوع" : "Retard"}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block"/>{isRTL ? "قابلة للكراء" : "Disponible"}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-500 inline-block"/>{isRTL ? "معطلة (صيانة)" : "En panne"}</span>
        {customStates.map(cs => (
          <span key={cs.id} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: cs.color }}/>
            {cs.label}
          </span>
        ))}
      </div>

      {/* ── Fleet status table (all 30 cars) ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 bg-slate-800 border-b border-slate-700">
          <Car size={15} className="text-white" />
          <span className="font-semibold text-sm text-white">
            {isRTL ? "حالة الأسطول الكامل" : "État complet de la flotte"} — {fmtDate(date)}
          </span>
          <span className="ms-auto bg-white/20 text-white text-xs rounded-full px-2 py-0.5">{allCars.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0">
                <th className="px-3 py-3 text-start">#</th>
                <th className="px-3 py-3 text-start">{isRTL ? "السيارة" : "Voiture"}</th>
                <th className="px-3 py-3 text-start">{isRTL ? "التسجيل" : "Série"}</th>
                <th className="px-3 py-3 text-start">{isRTL ? "الانطلاق" : "Sortie"}</th>
                <th className="px-3 py-3 text-start">{isRTL ? "الرجوع" : "Entrée"}</th>
                <th className="px-3 py-3 text-start">{isRTL ? "العميل" : "Nom"}</th>
                <th className="px-3 py-3 text-start">{isRTL ? "الهاتف" : "N TEL"}</th>
                <th className="px-3 py-3 text-center">I</th>
                <th className="px-3 py-3 text-center">N J</th>
                <th className="px-3 py-3 text-start">{isRTL ? "أتاوي (2dt/j)" : "Taxe 2dt/j"}</th>
                <th className="px-3 py-3 text-start">{isRTL ? "المبلغ" : "Montant T"}</th>
                <th className="px-3 py-3 text-start">{isRTL ? "مدفوع" : "Avance"}</th>
                <th className="px-3 py-3 text-start">{isRTL ? "الباقي" : "Reste"}</th>
                <th className="px-3 py-3 text-start">N°C</th>
                <th className="px-3 py-3 text-start">{isRTL ? "كلم انطلاق" : "Km Départ"}</th>
                <th className="px-3 py-3 text-start">{isRTL ? "كلم رجوع" : "Km Entrée"}</th>
                <th className="px-3 py-3 text-start">{isRTL ? "الحالة" : "État"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fleetStatusSorted.map((car, i) => {
                const c = car.contract;
                const customStateId = (car as any).customStateId as string | undefined;
                const customState = customStateId ? customStates.find(s => s.id === customStateId) : null;
                const isReturningToday = c && c.returnDate === todayStr && nowMinutes >= 8 * 60;

                // For custom state: derive a dark text color from the hex
                const customTextColor = customState ? customState.color : undefined;

                const rowStyle = car.state === "custom" ? "" : {
                  rented:      isReturningToday ? "bg-orange-50 hover:bg-orange-100" : "hover:bg-black/10",
                  late:        "bg-red-100 hover:bg-red-200",
                  maintenance: "bg-purple-100 hover:bg-purple-200",
                  available:   "bg-green-50 hover:bg-green-100",
                  custom:      "",
                }[car.state];

                const rowInlineStyle: React.CSSProperties = car.state === "custom" && customState
                  ? { backgroundColor: customState.color + "22" }
                  : car.state === "rented" && !isReturningToday
                  ? { backgroundColor: "rgba(0,0,0,0.06)" }
                  : {};

                // textStyle used for non-custom states
                const textStyle = {
                  rented:      isReturningToday ? "text-orange-900" : "text-slate-900",
                  late:        "text-red-900",
                  maintenance: "text-purple-900",
                  available:   "text-green-800",
                  custom:      "",
                }[car.state];

                // For custom: inline color style (darker shade via opacity trick)
                const customStyle: React.CSSProperties = customTextColor
                  ? { color: customTextColor, filter: "brightness(0.6)" }
                  : {};

                // Helper: get className + style for a cell
                const cell = (extra = "") => car.state === "custom"
                  ? { className: `px-3 py-2.5 font-medium ${extra}`, style: customStyle }
                  : { className: `px-3 py-2.5 ${textStyle} ${extra}`, style: {} };

                const total   = parseFloat(c?.totalFacture || "0");
                const advance = parseFloat(c?.depot || "0");
                const nj      = c ? daysBetween(c.departureDate, c.returnDate) : 0;
                // Taxe 2dt/j only for contracts from 2026+
                const contractYear = parseInt((c?.departureDate || "2026").slice(0, 4), 10);
                const taxeRate = contractYear >= 2026 ? 2 : 0;
                const taxe2d  = nj * taxeRate;
                // I = prix par jour = TOTAL FACTURE / NJ
                const pricePerDay = nj > 0 && total > 0 ? total / nj : 0;
                // Montant T = TOTAL FACTURE + (2 × NJ)
                const montantT = total > 0 ? total + taxe2d : 0;

                return (
                  <tr key={car.registration} style={rowInlineStyle} className={`transition-colors ${rowStyle}`}>
                    <td {...cell("opacity-60")}>{i + 1}</td>
                    <td {...cell("font-semibold")}>{car.brand} {car.model}</td>
                    <td className={`px-3 py-2 font-mono text-sm font-bold tracking-wide`} style={car.state === "custom" ? customStyle : car.state === "late" ? { color: "#b91c1c" } : {}}>{car.registration}</td>
                    {/* Sortie */}
                    <td {...cell()}>{c ? `${fmtDate(c.departureDate)} ${c.departureTime}` : "—"}</td>
                    {/* Entrée */}
                    <td className="px-3 py-2 font-medium" style={
                      car.state === "custom" ? customStyle :
                      car.state === "available" ? {} :
                      car.state === "late" ? { color: "#dc2626", fontWeight: 700 } :
                      isReturningToday ? { color: "#ea580c", fontWeight: 700 } : {}
                    }>
                      {c ? `${fmtDate(c.returnDate)} ${c.returnTime}` : "—"}
                      {car.state === "late" && " ⚠"}
                    </td>
                    {/* Nom */}
                    <td {...cell()}>{c?.driverName || "—"}</td>
                    {/* N TEL */}
                    <td {...cell()}>{c?.driverPhone || "—"}</td>
                    {/* I = prix/jour */}
                    <td className={`px-3 py-2 text-center font-medium ${textStyle}`}>
                      {pricePerDay > 0 ? pricePerDay.toFixed(0) : c?.totalPartiel || "—"}
                    </td>
                    {/* N J */}
                    <td className={`px-3 py-2 text-center font-bold ${car.state === "late" ? "text-red-700" : textStyle}`}>{nj > 0 ? nj : "—"}</td>
                    {/* Taxe 2dt/j */}
                    <td className={`px-3 py-2 font-medium ${textStyle}`}>{nj > 0 ? taxe2d.toFixed(3) : "—"}</td>
                    {/* Montant T = NJ × (I + 2) */}
                    <td className={`px-3 py-2 font-semibold ${car.state === "late" ? "text-red-700" : car.state === "rented" ? "text-green-700" : textStyle}`}>
                      {montantT > 0 ? montantT.toFixed(3) : "—"}
                    </td>
                    {/* Avance */}
                    <td className={`px-3 py-2 ${textStyle}`}>{advance > 0 ? advance.toFixed(3) : "0"}</td>
                    {/* Reste = Montant T - Avance */}
                    <td className={`px-3 py-2 font-bold ${(montantT - advance) > 0 ? "text-red-500" : montantT > 0 ? "text-green-600" : textStyle}`}>
                      {montantT > 0 ? ((montantT - advance) > 0 ? (montantT - advance).toFixed(3) : "✓") : "—"}
                    </td>
                    {/* N°C */}
                    <td className={`px-3 py-2 font-mono text-amber-600`}>{c?.contractNumber ? `#${c.contractNumber}` : "—"}</td>
                    {/* Km Départ */}
                    <td className={`px-3 py-2 ${textStyle} opacity-80`}>{c?.departureKm || "—"}</td>
                    {/* Km Entrée */}
                    <td className={`px-3 py-2 ${textStyle} opacity-80`}>{c?.returnKm || "—"}</td>
                    {/* État — clickable to change */}
                    <td className="px-3 py-2 relative">
                      <button
                        onClick={e => { e.stopPropagation(); if (!isST) setStateMenu(stateMenu === car.registration ? null : car.registration); }}
                        className={`${isST ? "cursor-default" : "cursor-pointer hover:opacity-80"} transition-opacity`}
                        title={isST ? "" : "Cliquer pour changer l'état"}
                      >
                      {{
                          rented:      isReturningToday
                            ? <span className="px-2 py-0.5 bg-orange-400 text-white rounded-full text-[10px]">🔔 Retour auj.</span>
                            : <span className="px-2 py-0.5 bg-slate-800 text-white rounded-full text-[10px]">Louée</span>,
                          late:        <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-[10px]">⚠ Retard</span>,
                          maintenance: <span className="px-2 py-0.5 bg-purple-500 text-white rounded-full text-[10px]">Panne</span>,
                          available:   <span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-[10px]">Dispo</span>,
                          custom:      <span className="px-2 py-0.5 text-white rounded-full text-[10px]" style={{ backgroundColor: customState?.color || "#64748b" }}>{customState?.label || "Custom"}</span>,
                        }[car.state]}
                      </button>
                      {stateMenu === car.registration && (
                        <div className="absolute right-0 top-8 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden w-44" onClick={e => e.stopPropagation()}>
                          <p className="px-3 py-1.5 text-[10px] text-slate-400 uppercase font-semibold border-b border-slate-100">Changer l'état</p>
                          {[
                            { state: "available"   as const, label: "✓ Rendue / Dispo", cls: "text-green-700 hover:bg-green-50" },
                            { state: "maintenance" as const, label: "🔧 En panne",       cls: "text-purple-700 hover:bg-purple-50" },
                          ].map(opt => (
                            <button key={opt.state} onClick={() => {
                              if (opt.state === "available" && car.contract && car.state === "rented") {
                                if (!confirm("La voiture a-t-elle été rendue avant la date prévue ?")) return;
                              }
                              setCarOverride(car.registration, opt.state);
                            }}
                              className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${opt.cls}`}>
                              {opt.label}
                            </button>
                          ))}
                          {customStates.map(cs => (
                            <div key={cs.id} className="flex items-center">
                              <button onClick={() => setCarOverride(car.registration, cs.id)}
                                className="flex-1 text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 transition-colors flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cs.color }} />
                                {cs.label}
                              </button>
                              <button onClick={e => { e.stopPropagation(); deleteCustomState(cs.id); }}
                                className="px-2 py-2 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <X size={11} />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => { setStateMenu(null); setShowCustomStateModal(true); }}
                            className="w-full text-left px-3 py-2 text-xs text-amber-600 hover:bg-amber-50 border-t border-slate-100 flex items-center gap-1.5 transition-colors">
                            <Plus size={11} /> Nouvelle état...
                          </button>
                          {(overrides[norm(car.registration)] || getOverrideOnDate(overrideHistory, car.registration, date)) && (
                            <button onClick={() => setCarOverride(car.registration, null)}
                              className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 border-t border-slate-100">
                              ↩ Réinitialiser
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Online Bookings from website ── */}
      {(onlineBookings.length > 0 || onlineBookingsLoading) && (
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-b border-green-100">
            <Globe size={14} className="text-green-600" />
            <span className="font-semibold text-sm text-green-700">{isRTL ? "حجوزات الموقع" : "Réservations en ligne"}</span>
            <span className="ms-auto bg-green-500 text-white text-xs rounded-full px-2 py-0.5">{onlineBookings.length}</span>
          </div>
          <div className="p-3 space-y-3 min-h-[80px]">
            {onlineBookingsLoading
              ? <p className="text-center text-slate-400 text-xs py-4 animate-pulse">Chargement...</p>
              : onlineBookings.length === 0
              ? <p className="text-center text-slate-400 text-xs py-4">{isRTL ? "لا توجد طلبات" : "Aucune demande"}</p>
              : onlineBookings.map(b => (
                <div key={b.id} className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800">{b.clientName}</p>
                      <p className="text-xs text-slate-500">{b.clientPhone}{b.clientEmail ? ` · ${b.clientEmail}` : ""}</p>
                      <p className="text-xs font-medium text-green-700 mt-0.5">{b.brand} {b.model} · {b.registration}</p>
                      <p className="text-xs text-slate-400">{b.startDate} → {b.endDate} ({b.days}j)</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-slate-800">{b.totalAmount} TND</p>
                      <p className="text-xs text-green-600">Acompte: {b.depositAmount} TND</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {b._createdAt ? new Date(b._createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                      </p>
                    </div>
                  </div>
                  {b.notes && <p className="text-xs text-slate-500 italic mb-2">"{b.notes}"</p>}
                  <div className="flex gap-2">
                    <button onClick={() => updateBookingStatus(b.id, "confirmed")}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors">
                      <Check size={12} /> {isRTL ? "موافقة" : "Confirmer"}
                    </button>
                    <button onClick={() => updateBookingStatus(b.id, "rejected")}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors">
                      <X size={12} /> {isRTL ? "رفض" : "Refuser"}
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── Sections: Reservations + Unpaid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Reservations */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
            <CalendarClock size={14} className="text-amber-600" />
            <span className="font-semibold text-sm text-amber-700">{isRTL ? "الحجوزات" : "Réservations"}</span>
            <span className="ms-auto bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">{res.length}</span>
            <button onClick={() => setModal("res")}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600">
              <Plus size={11} />
            </button>
          </div>
          <div className="p-3 space-y-2 min-h-[120px]">
            {res.length === 0
              ? <p className="text-center text-slate-400 text-xs py-6">{isRTL ? "لا توجد" : "Aucune"}</p>
              : res.map(r => (
                <div key={r.id} className="bg-amber-50 rounded-xl p-3 flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{r.clientName}</p>
                    <p className="text-xs text-slate-500">{r.brand} {r.registration} · {r.phone}</p>
                    <p className="text-xs text-slate-400">{r.startDate} → {r.endDate}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-xs font-bold text-amber-700">{r.advance ? `${r.advance} TND` : "—"}</p>
                    <p className="text-xs text-slate-400">{r.notes}</p>
                    <button onClick={() => setRes(p => p.filter(x => x.id !== r.id))}
                      className="text-slate-300 hover:text-red-500 mt-1"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Unpaid */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 border-b border-purple-100">
            <AlertCircle size={14} className="text-purple-600" />
            <span className="font-semibold text-sm text-purple-700">{isRTL ? "غير مدفوع" : "Impayés"}</span>
            <span className="ms-auto bg-purple-500 text-white text-xs rounded-full px-2 py-0.5">{unpaid.length}</span>
            <button onClick={() => setModal("unpaid")}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-500 text-white rounded-lg hover:bg-purple-600">
              <Plus size={11} />
            </button>
          </div>
          <div className="p-3 space-y-2 min-h-[120px]">
            {unpaid.length === 0
              ? <p className="text-center text-slate-400 text-xs py-6">{isRTL ? "لا توجد" : "Aucun"}</p>
              : unpaid.map(u => (
                <div key={u.id} className="bg-purple-50 rounded-xl p-3 flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{u.clientName}</p>
                    <p className="text-xs text-slate-500">#{u.contractNumber} · {u.phone}</p>
                    <p className="text-xs text-slate-400">{u.date}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-xs text-slate-500">Total: {u.total}</p>
                    <p className="text-xs text-green-600">↑ {u.advance}</p>
                    <p className="text-sm font-bold text-red-600">{u.rest} TND</p>
                    <button onClick={() => setUnpaid(p => p.filter(x => x.id !== u.id))}
                      className="text-slate-300 hover:text-red-500"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))
            }
            {unpaid.length > 0 && (
              <div className="bg-purple-100 rounded-lg px-3 py-2 flex justify-between text-xs font-bold">
                <span className="text-purple-700">{isRTL ? "الإجمالي الباقي" : "Total restant"}</span>
                <span className="text-red-600">{totalUnpaid.toFixed(3)} TND</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {modal === "maint" && <MaintModal onSave={m => { setMaint(p => [...p, { ...m, id: Date.now().toString() }]); setModal(null); }} onClose={() => setModal(null)} defaultDate={date} />}
      {modal === "res"   && <ResModal   onSave={r => { setRes(p => [...p, { ...r, id: Date.now().toString() }]); setModal(null); }} onClose={() => setModal(null)} defaultDate={date} />}
      {modal === "unpaid"&& <UnpaidModal onSave={u => { setUnpaid(p => [...p, { ...u, id: Date.now().toString() }]); setModal(null); }} onClose={() => setModal(null)} defaultDate={date} />}

      {/* Fleet Manager */}
      {showFleetManager && (
        <FleetManagerModal
          cars={fleetCars}
          contracts={contracts}
          onSave={setFleetCars}
          onClose={() => setShowFleetManager(false)}
          isRTL={isRTL}
        />
      )}

      {/* ── Custom State Modal ── */}
      {showCustomStateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Plus size={15} className="text-amber-500" /> Nouvelle état personnalisée
              </h3>
              <button onClick={() => setShowCustomStateModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Nom de l'état</label>
                <input value={newStateName} onChange={e => setNewStateName(e.target.value)}
                  placeholder="ex: Réservée, Accidentée, Vendue..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-2">Couleur</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => setNewStateColor(c)}
                      className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${newStateColor === c ? "ring-2 ring-offset-1 ring-slate-400 scale-110" : ""}`}
                      style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={newStateColor} onChange={e => setNewStateColor(e.target.value)}
                    className="w-7 h-7 rounded-lg cursor-pointer border border-slate-200" title="Couleur personnalisée" />
                </div>
              </div>
              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100" style={{ backgroundColor: newStateColor + "22" }}>
                <span className="text-sm text-slate-600">Aperçu:</span>
                <span className="px-2 py-0.5 text-white rounded-full text-xs font-medium" style={{ backgroundColor: newStateColor }}>
                  {newStateName || "Nom état"}
                </span>
              </div>
              {/* Existing custom states */}
              {customStates.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-400 mb-2">États existants:</p>
                  <div className="flex flex-wrap gap-2">
                    {customStates.map(cs => (
                      <div key={cs.id} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white" style={{ backgroundColor: cs.color }}>
                        {cs.label}
                        <button onClick={() => deleteCustomState(cs.id)} className="opacity-70 hover:opacity-100 ml-1">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
              <button onClick={() => setShowCustomStateModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
              <button onClick={saveCustomState} disabled={!newStateName.trim()}
                className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-lg font-medium">
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats Modal (Retour auj. / Retard) ── */}
      {statsModal && (() => {
        const isRetour = statsModal === "retour";
        const isRetard = statsModal === "retard";
        const isRented = statsModal === "rented";
        const isAvail  = statsModal === "available";
        const isMaint  = statsModal === "maintenance";
        const isRes    = statsModal === "reserved";
        const customS  = customStates.find(cs => cs.id === statsModal);

        let cars: typeof fleetStatus = [];
        let title = "";
        let color = "bg-slate-800";

        if (isRetour) {
          cars = fleetStatus.filter(c => c.contract?.returnDate === todayStr && (c.state === "rented" || c.state === "late"));
          title = "🔔 Retour aujourd'hui"; color = "bg-orange-400";
        } else if (isRetard) {
          cars = fleetStatus.filter(c => c.state === "late");
          title = "⚠ Retard"; color = "bg-red-500";
        } else if (isRented) {
          cars = fleetStatus.filter(c => c.state === "rented" || c.state === "late");
          title = "🚗 Louées"; color = "bg-slate-800";
        } else if (isAvail) {
          cars = fleetStatus.filter(c => c.state === "available");
          title = "✓ Disponibles"; color = "bg-green-500";
        } else if (isMaint) {
          cars = fleetStatus.filter(c => c.state === "maintenance");
          title = "🔧 En panne"; color = "bg-purple-500";
        } else if (customS) {
          cars = fleetStatus.filter(c => (c as any).customStateId === customS.id);
          title = customS.label; color = "";
        }

        if (isRes) {
          // Reservations — show resOnDate list
          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 bg-amber-400 rounded-t-2xl">
                  <h3 className="font-bold text-white">📅 Réservées <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full ms-2">{resOnDate.length}</span></h3>
                  <button onClick={() => setStatsModal(null)} className="text-white/70 hover:text-white text-xl">×</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {resOnDate.length === 0
                    ? <p className="text-center text-slate-400 py-10 text-sm">Aucune réservation</p>
                    : resOnDate.map(r => (
                      <div key={r.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap gap-4 items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800">{r.clientName}</p>
                          <p className="text-sm text-slate-500">{r.brand} {r.registration} · {r.phone}</p>
                          <p className="text-xs text-slate-400">{r.startDate} → {r.endDate}</p>
                        </div>
                        <p className="font-bold text-amber-700">{r.advance ? `${r.advance} TND` : "—"}</p>
                      </div>
                    ))
                  }
                </div>
                <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
                  <button onClick={() => setStatsModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Fermer</button>
                </div>
              </div>
            </div>
          );
        }

        // Sort by return date/time
        const sorted = [...cars].sort((a, b) => {
          const ta = (a.contract?.returnDate || "9999") + " " + (a.contract?.returnTime || "00:00");
          const tb = (b.contract?.returnDate || "9999") + " " + (b.contract?.returnTime || "00:00");
          return ta.localeCompare(tb);
        });

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className={`flex items-center justify-between px-5 py-4 ${color} rounded-t-2xl`} style={customS ? { backgroundColor: customS.color } : {}}>
                <h3 className="font-bold text-white">{title} <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full ms-2">{sorted.length}</span></h3>
                <button onClick={() => setStatsModal(null)} className="text-white/70 hover:text-white text-xl">×</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sorted.length === 0
                  ? <p className="text-center text-slate-400 py-10 text-sm">Aucun véhicule</p>
                  : sorted.map(car => {
                      const c = car.contract;
                      const isLate = car.state === "late";
                      const bgColor = isAvail ? "bg-green-50 border-green-200" : isMaint ? "bg-purple-50 border-purple-200" : isLate ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200";
                      return (
                        <div key={car.registration} className={`rounded-xl border p-4 flex flex-wrap gap-4 items-center justify-between ${bgColor}`}>
                          <div className="flex items-center gap-3 min-w-[160px]">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                              <Car size={18} className="text-slate-500" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{car.brand} {car.model}</p>
                              <p className="text-xs font-mono text-slate-500">{car.registration}</p>
                            </div>
                          </div>
                          {c && (
                            <>
                              <div className="min-w-[140px]">
                                <p className="text-xs text-slate-400 mb-0.5">Client</p>
                                <p className="font-semibold text-slate-800 text-sm">{c.driverName || "—"}</p>
                                <p className="text-sm text-slate-500">{c.driverPhone || "—"}</p>
                              </div>
                              <div className="min-w-[130px]">
                                <p className="text-xs text-slate-400 mb-0.5">{isAvail ? "Dernier contrat" : "Retour prévu"}</p>
                                <p className={`font-bold text-base ${isLate ? "text-red-600" : isAvail ? "text-slate-600" : "text-slate-800"}`}>{fmtDate(c.returnDate)}</p>
                                <p className="text-sm text-slate-500">{c.returnTime || ""}</p>
                              </div>
                              <div className="min-w-[100px]">
                                <p className="text-xs text-slate-400 mb-0.5">N°C</p>
                                <p className="font-mono text-amber-600 text-sm">{c.contractNumber ? `#${c.contractNumber}` : "—"}</p>
                                <p className="font-bold text-green-600 text-sm">{parseFloat(c.totalFacture||"0").toFixed(3)}</p>
                              </div>
                              {c.driverPhone && !isAvail && !isMaint && (
                                <button onClick={() => { setSmsContract(c); setStatsModal(null); }}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors flex-shrink-0">
                                  <MessageSquare size={15} /> SMS
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })
                }
              </div>
              <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
                <button onClick={() => setStatsModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Fermer</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── SMS Compose Modal ── */}
      {smsContract && (
        <SMSComposeModal
          contract={smsContract}
          onClose={() => setSmsContract(null)}
        />
      )}

    </div>
  );
}

// ─── Default fleet (30 cars) ──────────────────────────────────────────────────
const DEFAULT_FLEET = [
  { registration: "7468TU245", brand: "Kia", model: "Stonic D" },
  { registration: "9192TU234", brand: "Renault", model: "Clio Bleu" },
  { registration: "5605TU236", brand: "Hyundai", model: "I20 Noir" },
  { registration: "5606TU236", brand: "Hyundai", model: "I20 Blanc" },
  { registration: "8305TU238", brand: "Kia", model: "Rio" },
  { registration: "4485TU240", brand: "Volkswagen", model: "Virtus Blanc" },
  { registration: "4486TU240", brand: "Volkswagen", model: "Virtus Blanc" },
  { registration: "2526TU242", brand: "MG", model: "ZS B" },
  { registration: "2532TU242", brand: "MG", model: "ZS G" },
  { registration: "1389TU244", brand: "Seat", model: "Ibiza" },
  { registration: "1162TU245", brand: "Renault", model: "Clio Blanc" },
  { registration: "2504TU246", brand: "Hyundai", model: "I20 G" },
  { registration: "2508TU246", brand: "Hyundai", model: "I20 B" },
  { registration: "4912TU246", brand: "Kia", model: "Stonic B" },
  { registration: "203TU248",  brand: "Seat", model: "Ibiza N" },
  { registration: "201TU248",  brand: "Seat", model: "Ibiza B" },
  { registration: "1958TU248", brand: "Mahindra", model: "R" },
  { registration: "1959TU248", brand: "Mahindra", model: "B" },
  { registration: "1945TU251", brand: "Suzuki", model: "Swift R" },
  { registration: "5941TU251", brand: "Renault", model: "Clio Noir" },
  { registration: "5943TU251", brand: "Renault", model: "Clio Gris C" },
  { registration: "7138TU251", brand: "Seat", model: "Ibiza N" },
  { registration: "7057TU252", brand: "Kia", model: "Picanto" },
  { registration: "9601TU252", brand: "Skoda", model: "Kushaq B" },
  { registration: "9603TU252", brand: "Skoda", model: "Kushaq Bleu" },
  { registration: "3541TU253", brand: "Volkswagen", model: "Virtus Gris" },
  { registration: "7378TU254", brand: "Volkswagen", model: "T-Cross" },
  { registration: "7379TU254", brand: "Volkswagen", model: "T-Cross" },
  { registration: "7360TU255", brand: "Citroen", model: "Berlingo" },
  { registration: "6155TU259", brand: "Seat", model: "Ibiza N" },
];

function FleetManagerModal({ cars, contracts, onSave, onClose, isRTL }: {
  cars: {registration: string; brand: string; model: string}[];
  contracts: Contract[];
  onSave: (cars: {registration: string; brand: string; model: string}[]) => void;
  onClose: () => void;
  isRTL: boolean;
}) {
  const [list, setList] = useState([...cars]);
  const [newReg, setNewReg] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");

  // Suggestions from contracts
  const suggestions = useMemo(() => {
    const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 2);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    const map = new Map<string, {registration: string; brand: string; model: string}>();
    for (const c of contracts) {
      if (!c.registration || c.departureDate < cutoffStr) continue;
      const key = c.registration.trim().toUpperCase();
      if (!map.has(key) && !list.find(l => l.registration.trim().toUpperCase() === key)) {
        map.set(key, { registration: c.registration, brand: c.brand, model: c.model });
      }
    }
    return Array.from(map.values()).slice(0, 50);
  }, [contracts, list]);

  function addCar() {
    if (!newReg.trim()) return;
    const key = newReg.trim().toUpperCase();
    if (list.find(l => l.registration.trim().toUpperCase() === key)) return;
    setList(p => [...p, { registration: newReg.trim(), brand: newBrand.trim(), model: newModel.trim() }]);
    setNewReg(""); setNewBrand(""); setNewModel("");
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{isRTL ? "إدارة أسطول السيارات" : "Gestion de la flotte"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>

        {/* Add new */}
        <div className="px-5 py-3 border-b border-slate-100 flex gap-2 flex-wrap">
          <input value={newReg} onChange={e => setNewReg(e.target.value)} placeholder={isRTL ? "التسجيل" : "Immat."}
            className="flex-1 min-w-[100px] px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <input value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder={isRTL ? "الماركة" : "Marque"}
            className="flex-1 min-w-[80px] px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <input value={newModel} onChange={e => setNewModel(e.target.value)} placeholder={isRTL ? "الموديل" : "Modèle"}
            className="flex-1 min-w-[80px] px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          <button onClick={addCar} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg">
            <Plus size={14} />
          </button>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && list.length === 0 && (
          <div className="px-5 py-2 bg-blue-50 border-b border-blue-100">
            <p className="text-xs text-blue-600 mb-2">{isRTL ? "اقتراحات من العقود الأخيرة — اضغط لإضافة:" : "Suggestions des contrats récents — cliquez pour ajouter:"}</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map(s => (
                <button key={s.registration} onClick={() => setList(p => [...p, s])}
                  className="px-2 py-1 bg-white border border-blue-200 text-blue-700 text-xs rounded-lg hover:bg-blue-100">
                  {s.brand} {s.registration}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="text-slate-500 text-xs uppercase">
                <th className="px-4 py-2 text-start">#</th>
                <th className="px-4 py-2 text-start">{isRTL ? "التسجيل" : "Immat."}</th>
                <th className="px-4 py-2 text-start">{isRTL ? "الماركة" : "Marque"}</th>
                <th className="px-4 py-2 text-start">{isRTL ? "الموديل" : "Modèle"}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {list.map((c, i) => (
                <tr key={c.registration} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-2 font-mono font-semibold text-slate-700">{c.registration}</td>
                  <td className="px-4 py-2 text-slate-600">{c.brand}</td>
                  <td className="px-4 py-2 text-slate-500">{c.model}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => setList(p => p.filter((_, j) => j !== i))}
                      className="text-slate-300 hover:text-red-500"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-10">
              {isRTL ? "أضف سياراتك يدوياً أو من الاقتراحات" : "Ajoutez vos voitures manuellement ou depuis les suggestions"}
            </p>
          )}
        </div>

        <div className="flex justify-between items-center px-5 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-500">{list.length} {isRTL ? "سيارة" : "voitures"}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
              {isRTL ? "إلغاء" : "Annuler"}
            </button>
            <button onClick={() => { onSave(list); onClose(); }}
              className="px-4 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg">
              {isRTL ? "حفظ" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Add Modals ───────────────────────────────────────────────────────────────
function MaintModal({ onSave, onClose, defaultDate }: { onSave: (m: Omit<MaintenanceCar,"id">) => void; onClose: () => void; defaultDate: string }) {
  const [f, setF] = useState<Omit<MaintenanceCar,"id">>({ registration:"", brand:"", reason:"", entryDate:defaultDate, exitDate:"", mechanic:"", price:"", notes:"" });
  const s = (k: keyof typeof f) => (v: string) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title="إضافة سيارة في الصيانة" onClose={onClose} onSave={() => onSave(f)}>
      <F label="التسجيل" value={f.registration} onChange={s("registration")} />
      <F label="الماركة" value={f.brand} onChange={s("brand")} />
      <F label="السبب" value={f.reason} onChange={s("reason")} />
      <F label="الميكانيكي" value={f.mechanic} onChange={s("mechanic")} />
      <F label="تاريخ الدخول" value={f.entryDate} onChange={s("entryDate")} type="date" />
      <F label="تاريخ الخروج" value={f.exitDate} onChange={s("exitDate")} type="date" />
      <F label="السعر" value={f.price} onChange={s("price")} />
      <F label="ملاحظات" value={f.notes} onChange={s("notes")} />
    </Modal>
  );
}

function ResModal({ onSave, onClose, defaultDate }: { onSave: (r: Omit<Reservation,"id">) => void; onClose: () => void; defaultDate: string }) {
  const [f, setF] = useState<Omit<Reservation,"id">>({ clientName:"", phone:"", startDate:defaultDate, endDate:"", brand:"", registration:"", notes:"", advance:"" });
  const s = (k: keyof typeof f) => (v: string) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title="إضافة حجز" onClose={onClose} onSave={() => onSave(f)}>
      <F label="اسم العميل" value={f.clientName} onChange={s("clientName")} />
      <F label="الهاتف" value={f.phone} onChange={s("phone")} />
      <F label="الماركة" value={f.brand} onChange={s("brand")} />
      <F label="التسجيل" value={f.registration} onChange={s("registration")} />
      <F label="تاريخ البداية" value={f.startDate} onChange={s("startDate")} type="date" />
      <F label="تاريخ النهاية" value={f.endDate} onChange={s("endDate")} type="date" />
      <F label="مبلغ مقدم" value={f.advance} onChange={s("advance")} />
      <F label="ملاحظات" value={f.notes} onChange={s("notes")} />
    </Modal>
  );
}

function UnpaidModal({ onSave, onClose, defaultDate }: { onSave: (u: Omit<UnpaidRecord,"id">) => void; onClose: () => void; defaultDate: string }) {
  const [f, setF] = useState<Omit<UnpaidRecord,"id">>({ clientName:"", contractNumber:"", advance:"", rest:"", total:"", date:defaultDate, phone:"" });
  const s = (k: keyof typeof f) => (v: string) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title="إضافة مبلغ غير مدفوع" onClose={onClose} onSave={() => onSave(f)}>
      <F label="اسم العميل" value={f.clientName} onChange={s("clientName")} />
      <F label="رقم العقد" value={f.contractNumber} onChange={s("contractNumber")} />
      <F label="الهاتف" value={f.phone} onChange={s("phone")} />
      <F label="المجموع" value={f.total} onChange={s("total")} />
      <F label="المدفوع" value={f.advance} onChange={s("advance")} />
      <F label="الباقي" value={f.rest} onChange={s("rest")} />
      <F label="التاريخ" value={f.date} onChange={s("date")} type="date" />
    </Modal>
  );
}
