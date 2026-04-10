﻿﻿﻿﻿import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useContractStore } from "../store/useContractStore";
import {
  ArrowLeft, Camera, Plus, Trash2, FileText, TrendingUp, TrendingDown,
  Shield, Tag, Droplets, CheckCircle, MoreHorizontal,
  Calendar, DollarSign, Car, Wrench, ChevronDown, ChevronUp, X, Tag as SellIcon, Edit2
} from "lucide-react";
import type { CarProfile, CarDocument, CarExpense } from "../types";
import { getOdometerForReg } from "../services/gpsService";

// Safe GPS wrapper â€” won't crash in browser mode
async function safeGetOdometer(reg: string): Promise<number | null> {
  try { return await getOdometerForReg(reg); } catch { return null; }
}

const PROFILES_KEY = "palma_car_profiles";
const DB_URL_PROFILES = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

function loadProfiles(): Record<string, CarProfile> {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || "{}"); } catch { return {}; }
}
function saveProfiles(p: Record<string, CarProfile>) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(p));
}
async function fbSaveProfileDetail(key: string, profile: CarProfile) {
  try {
    await fetch(`${DB_URL_PROFILES}/car_profiles/${key}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
  } catch {}
}
function norm(s: string) { return String(s || "").replace(/\s+/g, "").toUpperCase(); }
function today() { return new Date().toISOString().split("T")[0]; }
function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - new Date(today()).getTime()) / 86400000);
}
function daysBetween(a: string, b: string) {
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const DOC_TYPES: CarDocument["type"][] = ["assurance", "vignette", "vidange", "visite_technique", "autre"];
const DOC_LABELS: Record<CarDocument["type"], string> = {
  assurance: "Assurance", vignette: "Vignette", vidange: "Vidange",
  visite_technique: "Visite technique", autre: "Autre",
};
const DOC_ICONS: Record<CarDocument["type"], React.ReactNode> = {
  assurance: <Shield size={15} />, vignette: <Tag size={15} />, vidange: <Droplets size={15} />,
  visite_technique: <CheckCircle size={15} />, autre: <MoreHorizontal size={15} />,
};
const EXP_CATS: CarExpense["category"][] = ["carburant", "reparation", "entretien", "assurance", "vignette", "autre"];
const EXP_LABELS: Record<CarExpense["category"], string> = {
  carburant: "Carburant", reparation: "Réparation", entretien: "Entretien",
  assurance: "Assurance", vignette: "Vignette", autre: "Autre",
};

const DEFAULT_FLEET = [
  { registration: "7468TU245", brand: "Kia",       model: "Stonic D" },
  { registration: "9192TU234", brand: "Renault",    model: "Clio Bleu" },
  { registration: "5605TU236", brand: "Hyundai",    model: "I20 Noir" },
  { registration: "5606TU236", brand: "Hyundai",    model: "I20 Blanc" },
  { registration: "8305TU238", brand: "Kia",        model: "Rio" },
  { registration: "4485TU240", brand: "Volkswagen", model: "Virtus Blanc" },
  { registration: "4486TU240", brand: "Volkswagen", model: "Virtus Blanc" },
  { registration: "2526TU242", brand: "MG",         model: "ZS B" },
  { registration: "2532TU242", brand: "MG",         model: "ZS G" },
  { registration: "1389TU244", brand: "Seat",       model: "Ibiza" },
  { registration: "1162TU245", brand: "Renault",    model: "Clio Blanc" },
  { registration: "2504TU246", brand: "Hyundai",    model: "I20 G" },
  { registration: "2508TU246", brand: "Hyundai",    model: "I20 B" },
  { registration: "4912TU246", brand: "Kia",        model: "Stonic B" },
  { registration: "203TU248",  brand: "Seat",       model: "Ibiza N" },
  { registration: "201TU248",  brand: "Seat",       model: "Ibiza B" },
  { registration: "1958TU248", brand: "Mahindra",   model: "XUV R" },
  { registration: "1959TU248", brand: "Mahindra",   model: "KUV300 B" },
  { registration: "1945TU251", brand: "Suzuki",     model: "Swift R" },
  { registration: "5941TU251", brand: "Renault",    model: "Clio Noir" },
  { registration: "5943TU251", brand: "Renault",    model: "Clio Gris C" },
  { registration: "7138TU251", brand: "Seat",       model: "Ibiza N" },
  { registration: "7057TU252", brand: "Kia",        model: "Picanto" },
  { registration: "9601TU252", brand: "Skoda",      model: "Kushaq B" },
  { registration: "9603TU252", brand: "Skoda",      model: "Kushaq Bleu" },
  { registration: "3541TU253", brand: "Volkswagen", model: "Virtus Gris" },
  { registration: "7378TU254", brand: "Volkswagen", model: "T-Cross" },
  { registration: "7379TU254", brand: "Volkswagen", model: "T-Cross" },
  { registration: "7360TU255", brand: "Citroen",    model: "Berlingo" },
  { registration: "6155TU259", brand: "Seat",       model: "Ibiza N" },
];

export default function VehicleDetail() {
  const { registration: regParam } = useParams<{ registration: string }>();
  const navigate = useNavigate();
  const contracts = useContractStore(s => s.contracts);
  const registration = decodeURIComponent(regParam || "");

  const fleetCars = useMemo(() => {
    try {
      const saved = localStorage.getItem("palma_fleet_cars");
      if (saved) { const p = JSON.parse(saved); if (p.length > 0) return p; }
    } catch {}
    return DEFAULT_FLEET;
  }, []);

  const car = fleetCars.find((c: { registration: string }) => norm(c.registration) === norm(registration));

  const [profiles, setProfiles] = useState<Record<string, CarProfile>>(() => loadProfiles());
  const [profileLoading, setProfileLoading] = useState(() => {
    // If we have cached data, no need to show loading
    const cached = loadProfiles();
    return !cached[norm(registration || "")];
  });

  // Load this car's profile â€” show cache immediately, refresh from Firebase in background
  useEffect(() => {
    const key = norm(registration);
    const cached = loadProfiles();

    // Show cached data immediately if available
    if (cached[key]) {
      setProfiles(prev => ({ ...prev, [key]: cached[key] }));
    }

    // Always fetch from Firebase to get latest (background refresh)
    fetch(`${DB_URL_PROFILES}/car_profiles/${key}.json`)
      .then(r => r.json())
      .then(data => {
        if (data) {
          const profile: CarProfile = {
            registration: key,
            documents: [],
            expenses: [],
            ...data,
          };
          setProfiles(prev => ({ ...prev, [key]: profile }));
          cached[key] = profile;
          saveProfiles(cached);
        }
      }).catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [registration]);
  const profileKey = norm(registration);
  const profile: CarProfile = profiles[profileKey] || { registration: profileKey, documents: [], expenses: [] };

  function updateProfile(updated: CarProfile) {
    const next = { ...profiles, [profileKey]: updated };
    setProfiles(next);
    saveProfiles(next);
    fbSaveProfileDetail(profileKey, updated);
  }

  // Sell car
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellPrice, setSellPrice] = useState("");
  const [showEditVehicleData, setShowEditVehicleData] = useState(false);
  const [vehicleDataForm, setVehicleDataForm] = useState<Partial<CarProfile>>({});

  // Photo upload â€” compress before saving to avoid localStorage quota
  const photoRef = useRef<HTMLInputElement>(null);
  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = document.createElement("canvas");
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // Max 800px wide, keep aspect ratio
      const maxW = 800;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL("image/jpeg", 0.75);
      URL.revokeObjectURL(url);
      try {
        updateProfile({ ...profile, photo: compressed });
      } catch {
        alert("Impossible de sauvegarder la photo â€” espace insuffisant.");
      }
    };
    img.src = url;
  }

  // Contracts for this car
  const carContracts = useMemo(() =>
    contracts
      .filter(c => norm(c.registration) === norm(registration) && !c._deleted)
      .sort((a, b) => b.departureDate.localeCompare(a.departureDate)),
    [contracts, registration]
  );

  // Financial stats
  const stats = useMemo(() => {
    const totalRevenue = carContracts.reduce((s, c) => s + parseFloat(c.totalFacture || "0"), 0);
    const totalDays = carContracts.reduce((s, c) =>
      s + (c.departureDate && c.returnDate ? daysBetween(c.departureDate, c.returnDate) : 0), 0
    );
    const totalExpenses = (profile.expenses || []).reduce((s, e) => s + e.amount, 0);
    const net = totalRevenue - totalExpenses;
    const avgPerDay = totalDays > 0 ? totalRevenue / totalDays : 0;
    return { totalRevenue, totalDays, totalExpenses, net, avgPerDay };
  }, [carContracts, profile.expenses]);

  // Monthly analytics â€” revenue, expenses, mensualité per month
  const monthlyStats = useMemo(() => {
    if (!profile.dateFirstTrait) return [];
    const mensualite = profile.priceTrait || 0;
    const firstTrait = new Date(profile.dateFirstTrait);
    const nombreMois = profile.nombreMoisFix || 0;

    // Build months from first versement to today
    const now = new Date();
    const startYear = firstTrait.getFullYear();
    const startMonth = firstTrait.getMonth();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth();

    const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;

    const months: {
      key: string; label: string;
      revenue: number; expenses: number; mensualite: number;
      profit: number; traitIndex: number | null;
    }[] = [];

    for (let i = 0; i < totalMonths; i++) {
      const d = new Date(startYear, startMonth + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

      const revenue = carContracts
        .filter(c => c.departureDate?.startsWith(key))
        .reduce((s, c) => s + parseFloat(c.totalFacture || "0"), 0);

      const expenses = (profile.expenses || [])
        .filter(e => e.date?.startsWith(key))
        .reduce((s, e) => s + e.amount, 0);

      const traitIndex = i < nombreMois ? i + 1 : null;
      const mois = traitIndex !== null ? mensualite : 0;

      months.push({
        key, label, revenue, expenses,
        mensualite: mois,
        profit: revenue - expenses - mois,
        traitIndex,
      });
    }
    return months;
  }, [carContracts, profile]);

  // GPS km state
  const [gpsKm, setGpsKm] = useState<number | null>(null);

  useEffect(() => {
    getOdometerForReg(registration).then(km => {
      if (km && km > 0) setGpsKm(km);
    }).catch(() => {});
  }, [registration]);

  // currentKm = max(GPS, latest contract km, profile.kilometrage)
  // Manual profile.kilometrage wins only if it's bigger than GPS
  const currentKm = useMemo(() => {
    const fromContracts = (() => {
      const withKm = carContracts
        .filter(c => c.returnKm && parseInt(c.returnKm) > 0)
        .sort((a, b) => b.returnDate.localeCompare(a.returnDate));
      if (withKm.length > 0) return parseInt(withKm[0].returnKm);
      const withDepKm = carContracts
        .filter(c => c.departureKm && parseInt(c.departureKm) > 0)
        .sort((a, b) => b.departureDate.localeCompare(a.departureDate));
      if (withDepKm.length > 0) return parseInt(withDepKm[0].departureKm);
      return 0;
    })();

    const candidates = [
      gpsKm || 0,
      fromContracts,
      profile.kilometrage || 0,
    ];
    return Math.max(...candidates) || undefined;
  }, [carContracts, profile.kilometrage, gpsKm]);
  function docStatus(d: CarDocument): "expired" | "urgent" | "ok" {
    if (d.type === "vidange") return "ok"; // handled separately in render
    const days = daysUntil(d.expiryDate);
    if (days < 0) return "expired";
    if (days <= 30) return "urgent";
    return "ok";
  }

  // Add/Edit document modal state
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<CarDocument | null>(null);
  const [newDoc, setNewDoc] = useState<Partial<CarDocument>>({ type: "assurance" });

  function openAddDoc() {
    setEditingDoc(null);
    setNewDoc({ type: "assurance" });
    setShowDocModal(true);
  }

  function openEditDoc(doc: CarDocument) {
    setEditingDoc(doc);
    setNewDoc({ ...doc });
    setShowDocModal(true);
  }

  function saveDoc() {
    if (newDoc.type === "vidange") {
      if (!newDoc.kmAtVidange) return;
    } else {
      if (!newDoc.expiryDate) return;
    }
    const kmAt = newDoc.type === "vidange" ? Number(newDoc.kmAtVidange) : undefined;
    const doc: CarDocument = {
      id: editingDoc?.id || uid(),
      type: newDoc.type || "assurance",
      label: newDoc.label || DOC_LABELS[newDoc.type || "assurance"],
      expiryDate: newDoc.expiryDate || "",
      notes: newDoc.notes || "",
      ...(newDoc.type === "vidange" && {
        kmAtVidange: kmAt,
        nextVidangeKm: (kmAt || 0) + 10000,
      }),
    };
    updateProfile({
      ...profile,
      documents: editingDoc
        ? (profile.documents || []).map(d => d.id === editingDoc.id ? doc : d)
        : [...(profile.documents || []), doc],
    });
    setNewDoc({ type: "assurance" });
    setEditingDoc(null);
    setShowDocModal(false);
  }

  function deleteDoc(id: string) {
    updateProfile({ ...profile, documents: (profile.documents || []).filter(d => d.id !== id) });
  }

  // Add expense modal state
  const [showExpModal, setShowExpModal] = useState(false);
  const [newExp, setNewExp] = useState<Partial<CarExpense>>({ category: "entretien", date: today() });

  function saveExp() {
    if (!newExp.amount || !newExp.date) return;
    const exp: CarExpense = {
      id: uid(), date: newExp.date!, category: newExp.category || "entretien",
      amount: Number(newExp.amount), description: newExp.description || "",
    };
    updateProfile({ ...profile, expenses: [...(profile.expenses || []), exp] });
    setNewExp({ category: "entretien", date: today() });
    setShowExpModal(false);
  }

  function deleteExp(id: string) {
    updateProfile({ ...profile, expenses: (profile.expenses || []).filter(e => e.id !== id) });
  }

  // Contracts filter
  const [contractSearch, setContractSearch] = useState("");
  const [showAllContracts, setShowAllContracts] = useState(false);
  const filteredContracts = useMemo(() => {
    const q = contractSearch.toLowerCase();
    return carContracts.filter(c =>
      !q || c.driverName?.toLowerCase().includes(q) ||
      c.contractNumber?.includes(q) || c.departureDate?.includes(q)
    );
  }, [carContracts, contractSearch]);
  const displayedContracts = showAllContracts ? filteredContracts : filteredContracts.slice(0, 5);

  if (!car) return (
    <div className="p-8 text-center text-slate-400">
      <Car size={40} className="mx-auto mb-3 opacity-30" />
      <p>Véhicule introuvable</p>
      <button onClick={() => navigate("/app/vehicles")} className="mt-3 text-amber-500 hover:underline text-sm">← Retour</button>
    </div>
  );

  return (
    <div className="p-5 space-y-5 max-w-6xl mx-auto">

      {/* â”€â”€ Header â”€â”€ */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/app/vehicles")}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">{car.brand} {car.model}</h1>
          <p className="text-sm font-mono text-slate-400">{car.registration}</p>
        </div>
        <button onClick={() => setShowSellModal(true)}
          className="flex items-center gap-2 px-3 py-2 text-xs bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors">
          <SellIcon size={13} />
          Vendre
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* â”€â”€ LEFT COLUMN â”€â”€ */}
        <div className="space-y-4">

          {/* Photo */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div
              className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center cursor-pointer group"
              onClick={() => photoRef.current?.click()}
            >
              {profile.photo
                ? <img src={profile.photo} alt={car.brand} className="w-full h-full object-cover" />
                : <Car size={56} className="text-slate-300" />
              }
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1 text-white">
                  <Camera size={22} />
                  <span className="text-xs font-medium">Changer la photo</span>
                </div>
              </div>
            </div>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            {profile.photo && (
              <button onClick={() => updateProfile({ ...profile, photo: undefined })}
                className="w-full py-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-1">
                <X size={12} /> Supprimer la photo
              </button>
            )}
          </div>

          {/* Financial summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
              <DollarSign size={15} className="text-amber-500" /> Finances
            </h3>
            {[
              { label: "Revenus totaux",  value: stats.totalRevenue, color: "text-green-600", icon: <TrendingUp size={13} /> },
              { label: "Dépenses totales", value: stats.totalExpenses, color: "text-red-500",  icon: <TrendingDown size={13} /> },
              { label: "Bénéfice net",    value: stats.net,           color: stats.net >= 0 ? "text-green-700" : "text-red-600", icon: <DollarSign size={13} /> },
            ].map(({ label, value, color, icon }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-slate-500 flex items-center gap-1">{icon}{label}</span>
                <span className={`text-sm font-bold ${color}`}>{value.toFixed(3)} TND</span>
              </div>
            ))}
            <div className="border-t border-slate-100 pt-2 flex justify-between text-xs text-slate-400">
              <span>{stats.totalDays} jours loués</span>
              <span>{stats.avgPerDay.toFixed(1)} TND/j moy.</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{carContracts.length} contrats</span>
            </div>
            {/* Imported financial data */}
            {profile.priceAchat && (
              <div className="border-t border-slate-100 pt-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Données véhicule</p>
                  <button onClick={() => setShowEditVehicleData(true)}
                    className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 transition-colors">
                    <Edit2 size={10} /> Modifier
                  </button>
                </div>
                {[
                  { label: "Prix d'achat",   value: profile.priceAchat?.toFixed(3) + " TND" },
                  { label: "Avance",         value: profile.avance?.toFixed(3) + " TND" },
                  { label: "Mensualité",     value: profile.priceTrait?.toFixed(3) + " TND" },
                  { label: "Durée",          value: (() => {
                    const total = profile.nombreMoisFix;
                    if (!total || !profile.dateFirstTrait) return total + " mois";
                    const start = new Date(profile.dateFirstTrait);
                    const end = new Date(start);
                    end.setMonth(end.getMonth() + total);
                    const now = new Date();
                    if (now >= end) return `${total} mois (âœ“ Terminé)`;
                    const diffMs = end.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffMs / 86400000);
                    const months = Math.floor(diffDays / 30);
                    const days = diffDays % 30;
                    const remaining = months > 0 ? `${months}m ${days}j` : `${days}j`;
                    return `${total} mois â€” reste ${remaining}`;
                  })() },
                  { label: "Kilométrage", value: <span className="flex items-center gap-1.5 justify-end">{currentKm?.toLocaleString()} km{gpsKm && gpsKm > 0 && <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">GPS</span>}</span> },
                  { label: "Couleur",        value: profile.color },
                  { label: "Année",          value: String(profile.year) },
                  { label: "1ère mise en service", value: profile.dateFirstCirculation },
                  { label: "1er versement",        value: profile.dateFirstTrait },
                ].filter(r => r.value && r.value !== "undefined" && r.value !== "null").map(r => (
                  <div key={r.label} className="flex justify-between text-xs">
                    <span className="text-slate-400">{r.label}</span>
                    <span className="font-medium text-slate-700">{r.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* â”€â”€ RIGHT COLUMN â”€â”€ */}
        <div className="lg:col-span-2 space-y-4">

          {/* Documents */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                <FileText size={15} className="text-blue-500" /> Documents & Échéances
              </h3>
              <button onClick={() => openAddDoc()}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors">
                <Plus size={12} /> Ajouter
              </button>
            </div>
            <div className="p-3 space-y-2">
              {profileLoading
                ? <p className="text-center text-slate-400 text-xs py-4 animate-pulse">Chargement...</p>
                : (profile.documents || []).length === 0
                ? <p className="text-center text-slate-400 text-xs py-4">Aucun document ajouté</p>
                : (profile.documents || []).map(doc => {
                  const status = docStatus(doc);

                  // â”€â”€ VIDANGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                  if (doc.type === "vidange") {
                    // Find the last vidange (highest nextVidangeKm)
                    const allVidanges = (profile.documents || []).filter(d => d.type === "vidange" && d.nextVidangeKm);
                    const maxNextKm = Math.max(...allVidanges.map(d => d.nextVidangeKm || 0));
                    const isLast = doc.nextVidangeKm === maxNextKm;
                    const remaining = (doc.nextVidangeKm || 0) - (currentKm || 0);

                    let rowStyle: string;
                    let textStyle: string;
                    let iconColor: string;
                    let badgeEl: JSX.Element;

                    if (!isLast) {
                      rowStyle = "bg-green-50 border-green-200";
                      textStyle = "text-green-700";
                      iconColor = "text-green-500";
                      badgeEl = <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Effectuée</span>;
                    } else if (remaining <= 0) {
                      rowStyle = "bg-red-50 border-red-200";
                      textStyle = "text-red-700";
                      iconColor = "text-red-500";
                      badgeEl = <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Dépassée !</span>;
                    } else if (remaining <= 200) {
                      rowStyle = "bg-red-50 border-red-200";
                      textStyle = "text-red-700";
                      iconColor = "text-red-500";
                      badgeEl = <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Dans {remaining} km !</span>;
                    } else {
                      rowStyle = "bg-blue-50 border-blue-200";
                      textStyle = "text-blue-700";
                      iconColor = "text-blue-500";
                      badgeEl = <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{remaining.toLocaleString()} km restants</span>;
                    }

                    return (
                      <div key={doc.id} className={`flex items-center gap-3 p-3 rounded-xl border ${rowStyle}`}>
                        <div className={`${iconColor} opacity-80`}>{DOC_ICONS[doc.type]}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${textStyle}`}>{doc.label}</p>
                          <p className="text-xs text-slate-400">
                            Faite Ã  {doc.kmAtVidange?.toLocaleString()} km · Prochaine Ã  {doc.nextVidangeKm?.toLocaleString()} km
                          </p>
                        </div>
                        {badgeEl}
                        <button onClick={() => openEditDoc(doc)} className="text-slate-300 hover:text-blue-500 transition-colors ml-1">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => deleteDoc(doc.id)} className="text-slate-300 hover:text-red-500 transition-colors ml-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  }

                  const days = daysUntil(doc.expiryDate);
                  const docRowStyle = days < 0
                    ? "bg-red-50 border-red-200"
                    : days <= 30
                    ? "bg-red-50 border-red-200"
                    : "bg-blue-50 border-blue-200";
                  const docTextStyle = days < 0
                    ? "text-red-700"
                    : days <= 30
                    ? "text-red-700"
                    : "text-blue-700";
                  const badge = days < 0
                    ? <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Expiré !</span>
                    : days <= 30
                    ? <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Dans {days}j !</span>
                    : <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{days}j restants</span>;
                  return (
                    <div key={doc.id} className={`flex items-center gap-3 p-3 rounded-xl border ${docRowStyle}`}>
                      <div className={`${docTextStyle} opacity-70`}>{DOC_ICONS[doc.type]}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${docTextStyle}`}>{doc.label}</p>
                        <p className="text-xs text-slate-400">Expire le {doc.expiryDate}{doc.notes ? ` · ${doc.notes}` : ""}</p>
                      </div>
                      {badge}
                      <button onClick={() => openEditDoc(doc)} className="text-slate-300 hover:text-blue-500 transition-colors ml-1">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => deleteDoc(doc.id)} className="text-slate-300 hover:text-red-500 transition-colors ml-1">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              }
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                <Wrench size={15} className="text-red-500" /> Dépenses
              </h3>
              <button onClick={() => setShowExpModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-colors">
                <Plus size={12} /> Ajouter
              </button>
            </div>
            <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
              {(profile.expenses || []).length === 0
                ? <p className="text-center text-slate-400 text-xs py-4">Aucune dépense enregistrée</p>
                : [...(profile.expenses || [])].sort((a, b) => b.date.localeCompare(a.date)).map(exp => (
                  <div key={exp.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">{EXP_LABELS[exp.category]}</span>
                        <span className="text-[10px] text-slate-400">{exp.date}</span>
                      </div>
                      {exp.description && <p className="text-xs text-slate-400 truncate">{exp.description}</p>}
                    </div>
                    <span className="text-sm font-bold text-red-600 whitespace-nowrap">{exp.amount.toFixed(3)} TND</span>
                    <button onClick={() => deleteExp(exp.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Monthly Analytics */}
          {monthlyStats.length > 0 && profile.priceTrait && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                  <TrendingUp size={15} className="text-amber-500" /> Analyse mensuelle
                </h3>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block"/>Revenus</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block"/>Mensualité</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-purple-400 inline-block"/>Dépenses</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {/* Bar chart */}
                {(() => {
                  const maxVal = Math.max(...monthlyStats.map(m => Math.max(m.revenue, m.mensualite + m.expenses)), 1);
                  return (
                    <div className="flex items-end gap-1.5 h-28">
                      {monthlyStats.map(m => (
                        <div key={m.key} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] rounded-lg px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none shadow-lg">
                            <p className="font-semibold">{m.label}</p>
                            <p className="text-amber-300">←‘ {m.revenue.toFixed(0)} TND</p>
                            {m.mensualite > 0 && <p className="text-red-300">←“ {m.mensualite.toFixed(0)} TND</p>}
                            {m.expenses > 0 && <p className="text-purple-300">←“ {m.expenses.toFixed(0)} TND</p>}
                            <p className={m.profit >= 0 ? "text-green-300" : "text-red-300"}>
                              = {m.profit >= 0 ? "+" : ""}{m.profit.toFixed(0)} TND
                            </p>
                          </div>
                          {/* Stacked bar */}
                          <div className="w-full flex flex-col-reverse gap-px" style={{ height: "96px" }}>
                            <div className="w-full rounded-t-sm bg-amber-400 transition-all"
                              style={{ height: `${Math.max(2, (m.revenue / maxVal) * 88)}px` }} />
                            <div className="w-full bg-red-400 transition-all"
                              style={{ height: m.mensualite > 0 ? `${Math.max(2, (m.mensualite / maxVal) * 88)}px` : "0px" }} />
                            <div className="w-full rounded-b-sm bg-purple-400 transition-all"
                              style={{ height: m.expenses > 0 ? `${Math.max(2, (m.expenses / maxVal) * 88)}px` : "0px" }} />
                          </div>
                          <span className="text-[9px] text-slate-400 mt-0.5">{m.label}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Monthly table */}
                <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-xl border border-slate-100">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="text-slate-400 text-[10px] uppercase border-b border-slate-100">
                        <th className="py-1.5 text-start">Mois</th>
                        <th className="py-1.5 text-end text-amber-600">Revenus</th>
                        <th className="py-1.5 text-end text-red-500">Mensualité</th>
                        <th className="py-1.5 text-end text-purple-500">Dépenses</th>
                        <th className="py-1.5 text-end">Solde</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {monthlyStats.map(m => (
                        <tr key={m.key} className={`${m.profit < 0 ? "bg-red-50/50" : m.revenue > 0 ? "bg-green-50/30" : ""}`}>
                          <td className="py-1.5 font-medium text-slate-600">
                            {m.label}
                            {m.traitIndex && <span className="ms-1 text-[9px] text-slate-400">#{m.traitIndex}</span>}
                          </td>
                          <td className="py-1.5 text-end font-mono text-amber-600">{m.revenue > 0 ? m.revenue.toFixed(0) : "â€”"}</td>
                          <td className="py-1.5 text-end font-mono text-red-500">{m.mensualite > 0 ? m.mensualite.toFixed(0) : "â€”"}</td>
                          <td className="py-1.5 text-end font-mono text-purple-500">{m.expenses > 0 ? m.expenses.toFixed(0) : "â€”"}</td>
                          <td className={`py-1.5 text-end font-bold ${m.profit > 0 ? "text-green-600" : m.profit < 0 ? "text-red-600" : "text-slate-400"}`}>
                            {m.revenue === 0 && m.expenses === 0 && m.mensualite === 0 ? "â€”" : (m.profit >= 0 ? "+" : "") + m.profit.toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200">
                      <tr>
                        <td className="py-2 font-bold text-slate-700 text-[11px]">Total ({monthlyStats.length} mois)</td>
                        <td className="py-2 text-end font-bold text-amber-600">{monthlyStats.reduce((s,m)=>s+m.revenue,0).toFixed(0)}</td>
                        <td className="py-2 text-end font-bold text-red-500">{monthlyStats.reduce((s,m)=>s+m.mensualite,0).toFixed(0)}</td>
                        <td className="py-2 text-end font-bold text-purple-500">{monthlyStats.reduce((s,m)=>s+m.expenses,0).toFixed(0)}</td>
                        <td className={`py-2 text-end font-bold text-sm ${monthlyStats.reduce((s,m)=>s+m.profit,0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {(()=>{const t=monthlyStats.reduce((s,m)=>s+m.profit,0); return (t>=0?"+":"")+t.toFixed(0)})()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Contracts */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                <Calendar size={15} className="text-amber-500" /> Contrats ({carContracts.length})
              </h3>
              <div className="relative">
                <input
                  value={contractSearch} onChange={e => setContractSearch(e.target.value)}
                  placeholder="Filtrer..."
                  className="pl-3 pr-7 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 w-36"
                />
                {contractSearch && (
                  <button onClick={() => setContractSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {filteredContracts.length === 0
                ? <p className="text-center text-slate-400 text-xs py-6">Aucun contrat trouvé</p>
                : displayedContracts.map(c => {
                  const nj = c.departureDate && c.returnDate ? daysBetween(c.departureDate, c.returnDate) : 0;
                  const total = parseFloat(c.totalFacture || "0");
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-amber-600">#{c.contractNumber}</span>
                          <span className="text-sm font-medium text-slate-800 truncate">{c.driverName}</span>
                        </div>
                        <p className="text-xs text-slate-400">{c.departureDate} ←’ {c.returnDate} · {nj}j</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">{total.toFixed(3)}</p>
                        <p className="text-[10px] text-slate-400">TND</p>
                      </div>
                    </div>
                  );
                })
              }
              {filteredContracts.length > 5 && (
                <button
                  onClick={() => setShowAllContracts(v => !v)}
                  className="w-full py-2.5 text-xs text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-center gap-1"
                >
                  {showAllContracts
                    ? <><ChevronUp size={13} /> Réduire</>
                    : <><ChevronDown size={13} /> Voir tous ({filteredContracts.length - 5} de plus)</>
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ Add Document Modal â”€â”€ */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">{editingDoc ? "Modifier le document" : "Ajouter un document"}</h3>
              <button onClick={() => setShowDocModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Type</label>
                <select value={newDoc.type} onChange={e => setNewDoc(d => ({ ...d, type: e.target.value as CarDocument["type"] }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Libellé (optionnel)</label>
                <input value={newDoc.label || ""} onChange={e => setNewDoc(d => ({ ...d, label: e.target.value }))}
                  placeholder={DOC_LABELS[newDoc.type || "assurance"]}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>

              {/* Vidange: km fields instead of expiry date */}
              {newDoc.type === "vidange" ? (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Km Ã  la vidange <span className="text-red-400">*</span></label>
                    <input
                      type="number" min="0"
                      value={newDoc.kmAtVidange || ""}
                      onChange={e => setNewDoc(d => ({ ...d, kmAtVidange: Number(e.target.value) }))}
                      placeholder={currentKm ? String(currentKm) : "ex: 45000"}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                    Prochaine vidange Ã  : <span className="font-bold">{newDoc.kmAtVidange ? (Number(newDoc.kmAtVidange) + 10000).toLocaleString() : "â€”"} km</span>
                    <span className="text-blue-400 ms-1">(alerte Ã  {newDoc.kmAtVidange ? (Number(newDoc.kmAtVidange) + 9800).toLocaleString() : "â€”"} km)</span>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Date de la vidange</label>
                    <input type="date" value={newDoc.expiryDate || today()} onChange={e => setNewDoc(d => ({ ...d, expiryDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Date d'expiration</label>
                  <input type="date" value={newDoc.expiryDate || ""} onChange={e => setNewDoc(d => ({ ...d, expiryDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Notes</label>
                <input value={newDoc.notes || ""} onChange={e => setNewDoc(d => ({ ...d, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
              <button onClick={() => setShowDocModal(false)} className="px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
              <button onClick={saveDoc} className="px-4 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Add Expense Modal â”€â”€ */}
      {showExpModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Ajouter une dépense</h3>
              <button onClick={() => setShowExpModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Catégorie</label>
                <select value={newExp.category} onChange={e => setNewExp(d => ({ ...d, category: e.target.value as CarExpense["category"] }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {EXP_CATS.map(c => <option key={c} value={c}>{EXP_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Montant (TND)</label>
                <input type="number" step="0.001" value={newExp.amount || ""} onChange={e => setNewExp(d => ({ ...d, amount: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Date</label>
                <input type="date" value={newExp.date || today()} onChange={e => setNewExp(d => ({ ...d, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Description</label>
                <input value={newExp.description || ""} onChange={e => setNewExp(d => ({ ...d, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
              <button onClick={() => setShowExpModal(false)} className="px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
              <button onClick={saveExp} className="px-4 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Sell Modal â”€â”€ */}
      {showSellModal && (() => {
        const sp = parseFloat(sellPrice) || 0;
        const priceAchat = profile.priceAchat || 0;
        const totalExpenses = stats.totalExpenses;
        const totalRevenue = stats.totalRevenue;
        const totalMensualites = (profile.priceTrait || 0) * (profile.nombreMoisFix || 0);
        const coutTotal = priceAchat + totalExpenses; // coût total de possession
        const totalEntrees = totalRevenue + sp;       // revenus kiraØ¡ + prix vente
        const profitNet = totalEntrees - coutTotal;
        const roi = coutTotal > 0 ? (profitNet / coutTotal) * 100 : 0;

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-green-50 rounded-t-2xl">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <SellIcon size={16} className="text-green-600" /> Vente du véhicule
                </h3>
                <button onClick={() => setShowSellModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
              </div>
              <div className="p-5 space-y-4">
                {/* Prix de vente input */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Prix de vente (TND)</label>
                  <input
                    type="number" step="0.001" value={sellPrice}
                    onChange={e => setSellPrice(e.target.value)}
                    placeholder="0.000"
                    className="w-full px-4 py-3 border-2 border-green-200 focus:border-green-400 rounded-xl text-lg font-bold text-slate-800 focus:outline-none text-center"
                    autoFocus
                  />
                </div>

                {/* Calcul détaillé */}
                {sp > 0 && (
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Bilan complet</p>

                    {/* Entrées */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-green-600 uppercase">Entrées</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Revenus location</span>
                        <span className="font-mono text-green-600">+{totalRevenue.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Prix de vente</span>
                        <span className="font-mono text-green-600">+{sp.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t border-slate-200 pt-1.5">
                        <span className="text-slate-700">Total entrées</span>
                        <span className="font-mono text-green-700">+{totalEntrees.toFixed(3)}</span>
                      </div>
                    </div>

                    {/* Sorties */}
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-semibold text-red-500 uppercase">Sorties</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Prix d'achat</span>
                        <span className="font-mono text-red-500">-{priceAchat.toFixed(3)}</span>
                      </div>
                      {totalMensualites > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Total mensualités ({profile.nombreMoisFix} mois)</span>
                          <span className="font-mono text-slate-400 text-xs">inclus dans prix achat</span>
                        </div>
                      )}
                      {totalExpenses > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Dépenses entretien</span>
                          <span className="font-mono text-red-500">-{totalExpenses.toFixed(3)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-semibold border-t border-slate-200 pt-1.5">
                        <span className="text-slate-700">Total sorties</span>
                        <span className="font-mono text-red-600">-{coutTotal.toFixed(3)}</span>
                      </div>
                    </div>

                    {/* Résultat */}
                    <div className={`rounded-xl p-3 mt-2 ${profitNet >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-700">Profit net</span>
                        <span className={`text-xl font-bold font-mono ${profitNet >= 0 ? "text-green-700" : "text-red-700"}`}>
                          {profitNet >= 0 ? "+" : ""}{profitNet.toFixed(3)} TND
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-slate-500">ROI</span>
                        <span className={`text-sm font-bold ${roi >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {roi >= 0 ? "+" : ""}{roi.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
                <button onClick={() => { setShowSellModal(false); setSellPrice(""); }}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                  Fermer
                </button>
                {sp > 0 && (
                  <button onClick={() => {
                    updateProfile({ ...profile, priceVent: sp });
                    setShowSellModal(false);
                    setSellPrice("");
                  }}
                    className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                    Confirmer la vente
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* â”€â”€ Edit Vehicle Data Modal â”€â”€ */}
      {showEditVehicleData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Edit2 size={15} className="text-amber-500" /> Modifier les données véhicule
              </h3>
              <button onClick={() => setShowEditVehicleData(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {[
                { key: "dailyPrice",          label: "ðŸ’» Prix location / jour (TND)", type: "number", val: profile.dailyPrice },
                { key: "priceAchat",          label: "Prix d'achat (TND)",       type: "number", val: profile.priceAchat },
                { key: "avance",              label: "Avance (TND)",             type: "number", val: profile.avance },
                { key: "priceTrait",          label: "Mensualité (TND)",         type: "number", val: profile.priceTrait },
                { key: "nombreMoisFix",       label: "Durée (mois)",             type: "number", val: profile.nombreMoisFix },
                { key: "dateFirstTrait",      label: "1er versement",            type: "date",   val: profile.dateFirstTrait },
                { key: "dateFirstCirculation",label: "1ère mise en service",     type: "date",   val: profile.dateFirstCirculation },
                { key: "color",               label: "Couleur",                  type: "text",   val: profile.color },
                { key: "year",                label: "Année",                    type: "number", val: profile.year },
              ].map(({ key, label, type, val }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-slate-500 block mb-1">{label}</label>
                  <input
                    type={type}
                    step={type === "number" ? "0.001" : undefined}
                    defaultValue={val ?? ""}
                    onChange={e => setVehicleDataForm(f => ({
                      ...f,
                      [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
              <button onClick={() => setShowEditVehicleData(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
              <button onClick={() => {
                updateProfile({ ...profile, ...vehicleDataForm });
                setShowEditVehicleData(false);
                setVehicleDataForm({});
              }} className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

