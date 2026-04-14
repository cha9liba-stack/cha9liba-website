import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { X, Eye, History, AlertTriangle, Printer } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  insertContract,
  updateContract,
  isDuplicateContractNumber,
  checkCarAvailability,
} from "../../services/contractService";
import { logAction } from "../../services/auditService";
import { useAuthStore } from "../../store/useAuthStore";
import { useContractStore } from "../../store/useContractStore";
import type { Contract } from "../../types";
import VehicleTab from "./tabs/VehicleTab";
import Driver1Tab from "./tabs/Driver1Tab";
import Driver2Tab from "./tabs/Driver2Tab";
import FinancialTab from "./tabs/FinancialTab";
import OtherTab from "./tabs/OtherTab";
import ContractPreview from "./ContractPreview";
import ContractLookupDialog from "./ContractLookupDialog";

// Palma Fleet cars (from RegistrationInput.tsx)
const PALMA_FLEET: Record<string, { brand: string; model: string; category: string }> = {
  "7468TU245": { brand: "Kia",        model: "Stonic D",      category: "SUV" },
  "9192TU234": { brand: "Renault",    model: "Clio Bleu",     category: "Citadine" },
  "5605TU236": { brand: "Hyundai",    model: "I20 Noir",      category: "Citadine" },
  "5606TU236": { brand: "Hyundai",    model: "I20 Blanc",     category: "Citadine" },
  "8305TU238": { brand: "Kia",        model: "Rio",           category: "Citadine" },
  "4485TU240": { brand: "Volkswagen", model: "Virtus Blanc",  category: "Berline" },
  "4486TU240": { brand: "Volkswagen", model: "Virtus Blanc",  category: "Berline" },
  "2526TU242": { brand: "MG",         model: "ZS B",          category: "SUV" },
  "2532TU242": { brand: "MG",         model: "ZS G",          category: "SUV" },
  "1389TU244": { brand: "Seat",       model: "Ibiza",         category: "Citadine" },
  "1162TU245": { brand: "Renault",    model: "Clio Blanc",    category: "Citadine" },
  "2504TU246": { brand: "Hyundai",    model: "I20 G",         category: "Citadine" },
  "2508TU246": { brand: "Hyundai",    model: "I20 B",         category: "Citadine" },
  "4912TU246": { brand: "Kia",        model: "Stonic B",      category: "SUV" },
  "203TU248":  { brand: "Seat",       model: "Ibiza N",       category: "Citadine" },
  "201TU248":  { brand: "Seat",       model: "Ibiza B",       category: "Citadine" },
  "1958TU248": { brand: "Mahindra",   model: "XUV R",         category: "SUV" },
  "1959TU248": { brand: "Mahindra",   model: "KUV300 B",      category: "SUV" },
  "1945TU251": { brand: "Suzuki",     model: "Swift R",       category: "Citadine" },
  "5941TU251": { brand: "Renault",    model: "Clio Noir",     category: "Citadine" },
  "5943TU251": { brand: "Renault",    model: "Clio Gris C",   category: "Citadine" },
  "7138TU251": { brand: "Seat",       model: "Ibiza N",       category: "Citadine" },
  "7057TU252": { brand: "Kia",        model: "Picanto",       category: "Citadine" },
  "9601TU252": { brand: "Skoda",      model: "Kushaq B",      category: "SUV" },
  "9603TU252": { brand: "Skoda",      model: "Kushaq Bleu",   category: "SUV" },
  "3541TU253": { brand: "Volkswagen", model: "Virtus Gris",   category: "Berline" },
  "7378TU254": { brand: "Volkswagen", model: "T-Cross",       category: "SUV" },
  "7379TU254": { brand: "Volkswagen", model: "T-Cross",       category: "SUV" },
  "7360TU255": { brand: "Citroen",    model: "Berlingo",      category: "Utilitaire" },
  "6155TU259": { brand: "Seat",       model: "Ibiza N",       category: "Citadine" },
};

function isPalmaCar(registration: string): boolean {
  const normReg = registration.replace(/\s+/g, "").toUpperCase();
  return PALMA_FLEET.hasOwnProperty(normReg);
}

const schema = z.object({
  contractNumber: z.string().optional().default(""),
  brand: z.string().optional().default(""),
  model: z.string().optional().default(""),
  category: z.string().optional().default(""),
  registration: z.string().optional().default(""),
  departureDate: z.string().optional().default(""),
  departureTime: z.string().optional().default(""),
  departurePlace: z.string().optional().default(""),
  returnDate: z.string().optional().default(""),
  returnTime: z.string().optional().default(""),
  departureKm: z.string().optional().default("0"),
  returnKm: z.string().optional().default(""),
  fuelType: z.enum(["Essence", "Gasoil", ""]).default(""),
  remiseRetour: z.string().optional().default(""),
  driverName: z.string().optional().default(""),
  driverDob: z.string().optional().default(""),
  driverBirthPlace: z.string().optional().default(""),
  driverAddress: z.string().optional().default(""),
  driverPhone: z.string().optional().default(""),
  driverCin: z.string().optional().default(""),
  driverCinDate: z.string().optional().default(""),
  driverCinPlace: z.string().optional().default(""),
  driverLicense: z.string().optional().default(""),
  driverLicenseDate: z.string().optional().default(""),
  driverLicensePlace: z.string().optional().default(""),
  hasDriver2: z.boolean().default(false),
  driver2Name: z.string().optional().default(""),
  driver2Dob: z.string().optional().default(""),
  driver2BirthPlace: z.string().optional().default(""),
  driver2Address: z.string().optional().default(""),
  driver2Phone: z.string().optional().default(""),
  driver2Cin: z.string().optional().default(""),
  driver2CinDate: z.string().optional().default(""),
  driver2CinPlace: z.string().optional().default(""),
  driver2License: z.string().optional().default(""),
  driver2LicenseDate: z.string().optional().default(""),
  driver2LicensePlace: z.string().optional().default(""),
  totalPartiel: z.string().optional().default("0.000"),
  divers: z.string().optional().default("0.000"),
  totalHT: z.string().optional().default("0.000"),
  tva: z.string().optional().default("0.000"),
  totalFacture: z.string().optional().default("0.000").refine(v => parseFloat(v || "0") >= 0, { message: "Le montant ne peut pas être négatif" }),
  plusMoinsDivers: z.string().optional().default("0.000"),
  depot: z.string().optional().default(""),
  depotGarantie: z.string().optional().default("0.000"),
  prep: z.string().optional().default("0.000"),
  total: z.string().optional().default("0.000"),
  somme: z.string().optional().default("0.000"),
  resteAPayer: z.string().optional().default("0.000"),
  city: z.string().optional().default(""),
  date: z.string().optional().default(""),
}).refine(
  data => !data.departureDate || !data.returnDate || data.returnDate > data.departureDate,
  { message: "La date de retour doit être supérieure à la date de départ (minimum 1 jour)", path: ["returnDate"] }
);

type FormData = z.infer<typeof schema>;

const TABS = ["vehicle_tab", "driver1_tab", "driver2_tab", "financial_tab", "other_tab"];

interface Props {
  contract: Contract | null;
  onClose: () => void;
}

export default function ContractModal({ contract, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const user = useAuthStore((s) => s.user);
  const selectedBranch = useAuthStore((s) => s.selectedBranch);
  const { upsertContract } = useContractStore();
  const contracts = useContractStore((s) => s.contracts);

  // Calculate next contract number (contracts starting with 0 and max 6 digits)
  const nextContractNumber = useMemo(() => {
    if (contract) return contract.contractNumber;
    const contracts = useContractStore.getState().contracts;
    const filteredContracts = contracts.filter(c =>
      c.contractNumber &&
      c.contractNumber.startsWith("0") &&
      /^\d+$/.test(c.contractNumber) &&
      c.contractNumber.length <= 6
    );
    const numbers = filteredContracts.map(c => parseInt(c.contractNumber, 10));
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 300000;
    return String(maxNumber + 1).padStart(6, "0");
  }, [contract]);

  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Handle Enter key to move to next field
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
        e.preventDefault();
        // Check if the input is inside a modal by looking for the closest fixed div
        const modal = (e.target as HTMLElement).closest('.fixed.inset-0');
        if (!modal) return;

        // Only consider visible inputs (in current tab)
        const allInputs = Array.from(modal.querySelectorAll("input:not([readonly]):not([disabled])")) as HTMLInputElement[];
        const visibleInputs = allInputs.filter(input => {
          const rect = input.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        const currentIndex = visibleInputs.indexOf(e.target);
        if (currentIndex !== -1 && currentIndex < visibleInputs.length - 1) {
          visibleInputs[currentIndex + 1].focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  const [bannedWarning, setBannedWarning] = useState<{ name: string; reason: string } | null>(null);
  const [debtWarning, setDebtWarning] = useState<{ amount: string; contractNumber: string } | null>(null);
  const [previewData, setPreviewData] = useState<Contract | null>(null);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [clientDebt, setClientDebt] = useState<{ total: number; paid: number; reste: number } | null>(null);
  const clientDebtRef = useRef<{ total: number; paid: number; reste: number } | null>(null);
  const [debtConfirmPending, setDebtConfirmPending] = useState(false);
  const [printWithoutSaveWarning, setPrintWithoutSaveWarning] = useState(false);
  const [overrideAvailability, setOverrideAvailability] = useState(false);

  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } =
    useForm<FormData>({
      resolver: zodResolver(schema) as any,
      defaultValues: contract
        ? { ...contract }
        : (() => {
            const now = new Date();
            const today = now.toISOString().split("T")[0];
            const time = String(now.getHours()).padStart(2,"0") + ":" + String(now.getMinutes()).padStart(2,"0");
            return {
              contractNumber: nextContractNumber,
              date: today,
              departureDate: today,
              departureTime: time,
              fuelType: "Essence",
              driverCinPlace: "Tunis",
            };
          })(),
    });

  // Save client to Firebase when creating a new contract
  async function saveClientToFirebase(data: FormData) {
    try {
      const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";
      const cin = data.driverCin?.trim().toUpperCase();
      if (!cin) return;

      // Fetch existing clients from Firebase
      const response = await fetch(`${DB}/clients.json`);
      const clients = await response.json() || {};
      const now = Date.now();

      // Find existing client by CIN
      let existingId = null;
      for (const [id, client] of Object.entries(clients) as any[]) {
        if (client.cin?.trim().toUpperCase() === cin) {
          existingId = id;
          break;
        }
      }

      if (existingId) {
        // Update existing client
        clients[existingId] = {
          ...clients[existingId],
          name: data.driverName,
          phone: data.driverPhone,
          address: data.driverAddress,
          dob: data.driverDob,
          cinDate: data.driverCinDate,
          cinPlace: data.driverCinPlace,
          license: data.driverLicense,
          licenseDate: data.driverLicenseDate,
          licensePlace: data.driverLicensePlace,
          _updatedAt: now,
        };
      } else {
        // Create new client
        const newId = `${now}-${Math.random().toString(36).substr(2, 9)}`;
        clients[newId] = {
          id: newId,
          name: data.driverName,
          cin: data.driverCin,
          phone: data.driverPhone,
          address: data.driverAddress,
          dob: data.driverDob,
          cinDate: data.driverCinDate,
          cinPlace: data.driverCinPlace,
          license: data.driverLicense,
          licenseDate: data.driverLicenseDate,
          licensePlace: data.driverLicensePlace,
          isCompany: false,
          _createdAt: now,
          _updatedAt: now,
        };
      }

      // Save to Firebase
      await fetch(`${DB}/clients.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clients),
      }).catch(() => {});

      // Also save to localStorage for offline use
      const clientsArray = Object.values(clients);
      localStorage.setItem("palma_clients", JSON.stringify(clientsArray));
    } catch (error) {
      console.error("Error saving client to Firebase:", error);
    }
  }

  // Save car to Firebase when creating a new contract
  async function saveCarToFirebase(data: FormData) {
    try {
      const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";
      const reg = data.registration?.trim().toUpperCase();
      if (!reg) return;

      // Check if car is in Palma fleet
      if (isPalmaCar(data.registration)) {
        return; // Don't save Palma cars
      }

      // Fetch existing custom cars from Firebase
      const response = await fetch(`${DB}/custom_cars.json`);
      const customCars = await response.json() || {};
      const now = Date.now();

      // Find existing car by registration
      let existingId = null;
      for (const [id, car] of Object.entries(customCars) as any[]) {
        if (car.registration?.trim().toUpperCase() === reg) {
          existingId = id;
          break;
        }
      }

      if (existingId) {
        // Update existing car
        customCars[existingId] = {
          ...customCars[existingId],
          brand: data.brand,
          model: data.model,
          category: data.category || "Citadine",
          _updatedAt: now,
        };
      } else {
        // Create new car
        const newId = `${now}-${Math.random().toString(36).substr(2, 9)}`;
        customCars[newId] = {
          id: newId,
          registration: data.registration,
          brand: data.brand,
          model: data.model,
          category: data.category || "Citadine",
          _createdAt: now,
          _updatedAt: now,
        };
      }

      // Save to Firebase
      await fetch(`${DB}/custom_cars.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customCars),
      }).catch(() => {});

      // Also save to localStorage for offline use
      const carsArray = Object.values(customCars);
      localStorage.setItem("palma_custom_cars", JSON.stringify(carsArray));
    } catch (error) {
      console.error("Error saving car to Firebase:", error);
    }
  }

  // Sync contract date with departureDate for new contracts
  const watchedDepartureDate = watch("departureDate");
  useEffect(() => {
    if (!contract && watchedDepartureDate) {
      setValue("date", watchedDepartureDate, { shouldDirty: false });
    }
  }, [watchedDepartureDate]);

  // Check if client is banned when CIN or name changes
  const watchedCin = watch("driverCin");
  const watchedName = watch("driverName");
  useEffect(() => {
    if (!watchedCin && !watchedName) return;
    // Debounce: wait 600ms after user stops typing
    const timer = setTimeout(async () => {
    try {
      // Search in Firebase first
      const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";
      const response = await fetch(`${DB}/clients.json`);
      const clients = await response.json() || {};

      let found = null;
      for (const [id, client] of Object.entries(clients) as any[]) {
        if ((watchedCin && client.cin?.trim().toUpperCase() === watchedCin?.trim().toUpperCase()) ||
            (watchedName && client.name?.trim().toLowerCase() === watchedName?.trim().toLowerCase())) {
          found = { ...client, id };
          break;
        }
      }

      // Auto-fill client data from Firebase if found
      if (found && watchedCin && found.cin?.trim().toUpperCase() === watchedCin?.trim().toUpperCase()) {
        if (found.name && !watchedName) setValue("driverName", found.name, { shouldDirty: true });
        if (found.dob) setValue("driverDob", found.dob, { shouldDirty: true });
        if (found.birthPlace) setValue("driverBirthPlace", found.birthPlace, { shouldDirty: true });
        if (found.address) setValue("driverAddress", found.address, { shouldDirty: true });
        if (found.phone) setValue("driverPhone", found.phone, { shouldDirty: true });
        if (found.cinDate) setValue("driverCinDate", found.cinDate, { shouldDirty: true });
        if (found.cinPlace) setValue("driverCinPlace", found.cinPlace, { shouldDirty: true });
        if (found.license) setValue("driverLicense", found.license, { shouldDirty: true });
        if (found.licenseDate) setValue("driverLicenseDate", found.licenseDate, { shouldDirty: true });
        if (found.licensePlace) setValue("driverLicensePlace", found.licensePlace, { shouldDirty: true });
      }

      if (found?.banned) {
        setBannedWarning({ name: found.name, reason: found.banReason || "" });
      } else {
        setBannedWarning(null);
      }

      // Check for debt warnings
      if (watchedCin && found) {
        fetch(`${DB}/clients/${found.id}/alerts.json`)
          .then(r => r.json())
          .then(alerts => {
            if (alerts) {
              const debtAlert = Object.values(alerts).find((a: any) => a.type === "debt");
              if (debtAlert) {
                setDebtWarning({ amount: debtAlert.amount || "", contractNumber: debtAlert.contractNumber || "" });
              } else {
                setDebtWarning(null);
              }
            } else {
              setDebtWarning(null);
            }
          }).catch(() => setDebtWarning(null));

        // Calculate debt from contracts
        const clientContracts = contracts.filter((c: any) => c.driverCin?.trim().toUpperCase() === watchedCin?.trim().toUpperCase());
        const debts: Record<string, { paid: number; reste: number }> = {};
        let totalPaid = 0;
        let totalReste = 0;
        let totalDebt = 0;

        for (const c of clientContracts) {
          if (!c.id) continue;
          const debt = debts[c.id] || {
            paid: parseFloat(c.depot || "0"),
            reste: Math.max(0, parseFloat(c.somme || c.totalFacture || "0") - parseFloat(c.depot || "0"))
          };
          totalPaid += debt.paid;
          totalReste += debt.reste;
        }
        totalDebt = totalPaid + totalReste;

        if (totalReste > 0) {
          const debt = { total: totalDebt, paid: totalPaid, reste: totalReste };
          setClientDebt(debt);
          clientDebtRef.current = debt;
          // Show debt warning modal immediately when CIN is entered
          if (!contract) setDebtConfirmPending(true);
        } else {
          setClientDebt(null);
          clientDebtRef.current = null;
        }
      } else {
        setClientDebt(null);
        clientDebtRef.current = null;
      }
    } catch {}
    }, 600);
    return () => clearTimeout(timer);
  }, [watchedCin, watchedName, contract?.id, setValue, contracts]);

  // Jump to first tab with errors
  const TAB_FIELDS: Record<number, string[]> = {
    0: ["contractNumber","brand","model","registration","departureDate","departureTime","departurePlace","returnDate","returnTime","departureKm","fuelType"],
    1: ["driverName","driverDob","driverAddress","driverPhone","driverCin","driverCinDate","driverCinPlace","driverLicense","driverLicenseDate"],
    2: ["driver2Name","driver2Cin"],
    3: ["totalFacture"],
    4: ["city","date"],
  };

  function jumpToFirstError(errs: typeof errors) {
    for (let i = 0; i <= 4; i++) {
      if (TAB_FIELDS[i]?.some(f => errs[f as keyof typeof errs])) {
        setActiveTab(i);
        return;
      }
    }
  }

  // Called after user confirms debt warning (or no debt)
  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setError("");
    await doSave(data);
  };

  function handleSaveClick() {
    handleSubmit(onSubmit as any, (errs) => jumpToFirstError(errs))();
  }

  async function doSave(data: FormData) {
    setError("");
    try {
      setSaving(true);

      // Check internet connection
      if (!navigator.onLine) {
        setError("⚠️ Pas de connexion internet. Le contrat sera sauvegardé localement.");
      }

      // For Palma cars, all fields are required
      if (isPalmaCar(data.registration)) {
        if (!data.contractNumber?.trim()) {
          setError(isRTL ? "⚠️ رقم العقد مطلوب" : "⚠️ Le numéro de contrat est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.brand?.trim()) {
          setError(isRTL ? "⚠️ الماركة مطلوبة" : "⚠️ La marque est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.model?.trim()) {
          setError(isRTL ? "⚠️ الموديل مطلوب" : "⚠️ Le modèle est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.registration?.trim()) {
          setError(isRTL ? "⚠️ المتريكيل مطلوب" : "⚠️ L'immatriculation est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.departureDate?.trim()) {
          setError(isRTL ? "⚠️ تاريخ المغادرة مطلوب" : "⚠️ La date de départ est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.departureTime?.trim()) {
          setError(isRTL ? "⚠️ وقت المغادرة مطلوب" : "⚠️ L'heure de départ est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.departurePlace?.trim()) {
          setError(isRTL ? "⚠️ مكان المغادرة مطلوب" : "⚠️ Le lieu de départ est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.returnDate?.trim()) {
          setError(isRTL ? "⚠️ تاريخ العودة مطلوب" : "⚠️ La date de retour est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.returnTime?.trim()) {
          setError(isRTL ? "⚠️ وقت العودة مطلوب" : "⚠️ L'heure de retour est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.driverName?.trim()) {
          setError(isRTL ? "⚠️ اسم السائق مطلوب" : "⚠️ Le nom du conducteur est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.driverDob?.trim()) {
          setError(isRTL ? "⚠️ تاريخ ميلاد السائق مطلوب" : "⚠️ La date de naissance du conducteur est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.driverAddress?.trim()) {
          setError(isRTL ? "⚠️ عنوان السائق مطلوب" : "⚠️ L'adresse du conducteur est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.driverPhone?.trim()) {
          setError(isRTL ? "⚠️ رقم هاتف السائق مطلوب" : "⚠️ Le téléphone du conducteur est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.driverCin?.trim()) {
          setError(isRTL ? "⚠️ رقم بطاقة التعريف مطلوب" : "⚠️ Le CIN du conducteur est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.driverCinDate?.trim()) {
          setError(isRTL ? "⚠️ تاريخ بطاقة التعريف مطلوب" : "⚠️ La date du CIN est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.driverCinPlace?.trim()) {
          setError(isRTL ? "⚠️ مكان بطاقة التعريف مطلوب" : "⚠️ Le lieu du CIN est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.driverLicense?.trim()) {
          setError(isRTL ? "⚠️ رقم رخصة السياقة مطلوب" : "⚠️ Le numéro de permis est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.driverLicenseDate?.trim()) {
          setError(isRTL ? "⚠️ تاريخ رخصة السياقة مطلوب" : "⚠️ La date du permis est obligatoire");
          setSaving(false);
          return;
        }
        if (!data.depot?.trim()) {
          setError(isRTL ? "⚠️ المبلغ المدفوع مطلوب" : "⚠️ L'avance est obligatoire");
          setSaving(false);
          return;
        }
      }

      // Validate amounts
      const facture = parseFloat(data.totalFacture || "0");
      if (facture <= 0) {
        setError(isRTL ? "⚠️ يجب إدخال مبلغ الفاتورة" : "⚠️ Le montant TOTAL FACTURE est obligatoire");
        setSaving(false);
        return;
      }
      const avance = parseFloat(data.depot || "0");
      const sommeVal = parseFloat(data.somme || "0");
      if (avance < 0) {
        setError(isRTL ? "⚠️ المبلغ المدفوع لا يمكن أن يكون سالباً" : "⚠️ L'avance ne peut pas être négative");
        setSaving(false);
        return;
      }
      if (sommeVal > 0 && avance > sommeVal) {
        setError(isRTL ? "⚠️ المبلغ المدفوع أكبر من المجموع" : "⚠️ L'avance dépasse le total");
        setSaving(false);
        return;
      }

      const isDup = await isDuplicateContractNumber(data.contractNumber, contract?.id);
      if (isDup) { setError(t("duplicate_number")); setSaving(false); return; }

      // Check car availability (no overlapping contracts)
      if (data.registration && data.departureDate && data.returnDate && !overrideAvailability) {
        const avail = await checkCarAvailability(
          data.registration,
          data.departureDate,
          data.returnDate,
          contract?.id
        );
        if (!avail.available && avail.conflictContract) {
          const c = avail.conflictContract;
          setError(
            `⚠️ ${data.registration} est déjà louée du ${c.departureDate} au ${c.returnDate} (Contrat #${c.contractNumber} - ${c.driverName})`
          );
          setSaving(false);
          return;
        }
      }

      const paid  = parseFloat(data.depot  || "0");
      const somme = parseFloat(data.somme  || "0");
      const reste = Math.max(0, somme - paid);

      // Set resteAPayer in data
      data.resteAPayer = reste.toFixed(3);

      function syncDebt(contractId: string) {
        try {
          const debts = JSON.parse(localStorage.getItem("palma_contract_debts") || "{}");
          debts[contractId] = { paid, reste };
          localStorage.setItem("palma_contract_debts", JSON.stringify(debts));
        } catch {}
      }

      if (contract?.id) {
        // Keep original branchId - don't change it on edit
        const originalBranchId = (contract as any).branchId;
        await updateContract(contract.id, { ...data, branchId: originalBranchId, _updatedBy: user?.username || "unknown", _updatedAt: Date.now() } as Partial<Contract>);
        upsertContract({ ...data, id: contract.id, branchId: originalBranchId, _updatedBy: user?.username || "unknown", _updatedAt: Date.now() } as Contract);
        syncDebt(contract.id);
        await logAction(user, "update_contract", contract.id);
        await saveClientToFirebase(data);
        await saveCarToFirebase(data);
      } else {
        const id = await insertContract({ ...data, _createdBy: user?.username || "unknown", _createdAt: Date.now(), branchId: selectedBranch?.id || "main" } as Omit<Contract, "id">);
        upsertContract({ ...data, id } as Contract);
        syncDebt(id);
        await logAction(user, "create_contract", id);
        await saveClientToFirebase(data);
        await saveCarToFirebase(data);
        // Clear any manual override for this car starting from contract departure date
        try {
          const reg = String((data as any).registration || "").replace(/\s+/g, "").toUpperCase();
          const depDate = String((data as any).departureDate || new Date().toISOString().split("T")[0]);
          if (reg) {
            const history = JSON.parse(localStorage.getItem("palma_state_overrides") || "{}");
            const prev = new Date(depDate);
            prev.setDate(prev.getDate() - 1);
            const prevStr = prev.toISOString().split("T")[0];

            const raw = history[reg];
            if (Array.isArray(raw)) {
              // New format: array of {state, from, to}
              history[reg] = raw.map((e: any) => {
                if (e.to === null || e.to === undefined || e.to >= depDate) {
                  return { ...e, to: prevStr };
                }
                return e;
              });
            } else if (raw && typeof raw === "object") {
              // Old format: single object {state, from} - close it
              history[reg] = [{ ...raw, to: prevStr }];
            } else {
              // No override - nothing to do
              delete history[reg];
            }

            localStorage.setItem("palma_state_overrides", JSON.stringify(history));
            const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";
            await fetch(`${DB}/app_settings/overrides.json`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(history),
            }).catch(() => {});
          }
        } catch {}
      }
      onClose();
    } catch (err: any) {
      const msg = err?.message || t("error_occurred");
      setError(msg);
      console.error("[ContractModal] doSave error:", err);
    } finally {
      setSaving(false);
    }
  };

  function openPreview() {
    const data = getValues();
    setPreviewData({ ...data, id: contract?.id } as Contract);
  }

  async function openPreviewWithCheck() {
    const data = getValues();
    if (!contract) {
      const isDup = await isDuplicateContractNumber(data.contractNumber, undefined);
      if (isDup) { setError(t("duplicate_number")); return; }

      // Check car availability before preview too
      if (data.registration && data.departureDate && data.returnDate) {
        const avail = await checkCarAvailability(data.registration, data.departureDate, data.returnDate, undefined);
        if (!avail.available && avail.conflictContract) {
          const c = avail.conflictContract;
          setError(`⚠️ ${data.registration} est déjà louée du ${c.departureDate} au ${c.returnDate} (Contrat #${c.contractNumber})`);
          return;
        }
      }
      // Show warning for new contracts (not yet saved)
      setPrintWithoutSaveWarning(true);
      return;
    }
    setError("");
    setPreviewData({ ...data, id: contract?.id } as Contract);
  }

  async function handlePrintWithSave() {
    const data = getValues();
    setPrintWithoutSaveWarning(false);
    setError("");
    await doSave(data);
    setPreviewData({ ...data, id: contract?.id } as Contract);
  }

  function handlePrintWithoutSave() {
    const data = getValues();
    setPrintWithoutSaveWarning(false);
    setError("");
    setPreviewData({ ...data, id: contract?.id } as Contract);
  }

  function handleLookupSelect(old: Contract) {
    // Copy all fields except id and contractNumber (keep new number)
    const currentNumber = getValues("contractNumber");
    const fields = { ...old };
    delete (fields as any).id;
    // Reset form with old data but keep the auto-generated contract number
    Object.entries(fields).forEach(([key, val]) => {
      if (key !== "contractNumber" && key !== "_createdAt" && key !== "_updatedAt") {
        setValue(key as any, val ?? "", { shouldDirty: true });
      }
    });
    // Restore contract number (new one)
    if (currentNumber) setValue("contractNumber", currentNumber);
    setLookupOpen(false);
  }

  const tabComponents = [
    <VehicleTab register={register} errors={errors} watch={watch} setValue={setValue} isNew={!contract} contractId={contract?.id} />,
    <Driver1Tab register={register} errors={errors} prefix="" setValue={setValue} watch={watch} />,
    <Driver2Tab register={register} errors={errors} watch={watch} setValue={setValue} />,
    <FinancialTab register={register} watch={watch} setValue={setValue} />,
    <OtherTab register={register} />,
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-slate-800">
                {contract ? t("edit") : t("new_contract")}
              </h2>
              {/* Show lookup button only for new contracts */}
              {!contract && (
                <button
                  type="button"
                  onClick={() => setLookupOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                >
                  <History size={13} />
                  {isRTL ? "استرداد من عقد سابق" : "Récupérer un contrat"}
                </button>
              )}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 overflow-x-auto">
            {TABS.map((tab, i) => {
              const hasError = TAB_FIELDS[i]?.some(f => errors[f as keyof typeof errors]);
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(i)}
                  className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 relative ${
                    activeTab === i
                      ? "border-amber-500 text-amber-600"
                      : hasError
                      ? "border-red-400 text-red-500"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t(tab)}
                  {hasError && <span className="absolute top-2 end-2 w-1.5 h-1.5 bg-red-500 rounded-full"/>}
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleSaveClick(); }} className="flex-1 overflow-y-auto">
            <div className="p-6">{tabComponents[activeTab]}</div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <div className="flex-1 space-y-2">
                {error && <p className="text-sm text-red-500">{error}</p>}
                {bannedWarning && (
                  <div className="flex items-center gap-2 bg-red-100 border border-red-300 rounded-lg px-3 py-2">
                    <span className="text-red-600 text-lg">⛔</span>
                    <div>
                      <p className="text-sm font-bold text-red-700">Client bloqué: {bannedWarning.name}</p>
                      {bannedWarning.reason && <p className="text-xs text-red-600">Raison: {bannedWarning.reason}</p>}
                    </div>
                  </div>
                )}
                {clientDebt && (
                  <div className="flex items-center gap-2 bg-red-100 border border-red-300 rounded-lg px-3 py-2">
                    <span className="text-red-600 text-lg">💰</span>
                    <div>
                      <p className="text-sm font-bold text-red-700">Dette client</p>
                      <p className="text-xs text-red-600">Total: {clientDebt.total.toFixed(2)} TND | Payé: {clientDebt.paid.toFixed(2)} TND | Reste: {clientDebt.reste.toFixed(2)} TND</p>
                    </div>
                  </div>
                )}
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-700">
                  <input
                    type="checkbox"
                    checked={overrideAvailability}
                    onChange={(e) => setOverrideAvailability(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  />
                  <span>{isRTL ? "تجاوز التحقق من توفر السيارة" : "Ignorer la vérification de disponibilité"}</span>
                </label>
              </div>
              <div className="flex gap-3 ms-auto">
                <button
                  type="button"
                  onClick={openPreviewWithCheck}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Eye size={15} />
                  {t("preview")}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSaveClick}
                  disabled={saving}
                  className="px-5 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-60"
                >
                  {saving ? t("loading") : t("save")}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Contract Preview */}
      {previewData && (
        <ContractPreview contract={previewData} onClose={() => setPreviewData(null)} />
      )}

      {/* Contract Lookup */}
      {lookupOpen && (
        <ContractLookupDialog
          onSelect={handleLookupSelect}
          onClose={() => setLookupOpen(false)}
        />
      )}

      {/* Debt Confirmation Modal */}
      {debtConfirmPending && clientDebt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-red-100 bg-red-50 rounded-t-2xl">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800">
                  {isRTL ? "تحذير: العميل لديه ديون" : "Client avec dettes impayées"}
                </p>
                <p className="text-xs text-red-500">
                  {isRTL ? "يرجى مراجعة الوضع المالي قبل المتابعة" : "Vérifiez la situation financière avant de continuer"}
                </p>
              </div>
              <button onClick={() => setDebtConfirmPending(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="divide-y divide-slate-100">
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                  💰
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{watch("driverName")}</p>
                  <p className="text-xs font-mono text-slate-500">{watch("driverCin")}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isRTL ? "ديون من عقود سابقة" : "Dettes sur contrats précédents"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 space-y-0.5">
                  <p className="text-xs text-slate-400">{isRTL ? "المتبقي" : "Reste dû"}</p>
                  <p className="text-lg font-bold text-red-600">{clientDebt.reste.toFixed(3)}</p>
                  <p className="text-xs text-slate-400">TND</p>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100 text-center">
                <div className="px-5 py-3">
                  <p className="text-xs text-slate-400 mb-1">{isRTL ? "الإجمالي" : "Total facturé"}</p>
                  <p className="font-semibold text-slate-700">{clientDebt.total.toFixed(3)} TND</p>
                </div>
                <div className="px-5 py-3">
                  <p className="text-xs text-slate-400 mb-1">{isRTL ? "المدفوع" : "Déjà payé"}</p>
                  <p className="font-semibold text-green-600">{clientDebt.paid.toFixed(3)} TND</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
              <button
                onClick={() => setDebtConfirmPending(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {isRTL ? "إلغاء" : "Annuler"}
              </button>
              <button
                onClick={() => {
                  setDebtConfirmPending(false);
                  handleSubmit(onSubmit as any, (errs) => jumpToFirstError(errs))();
                }}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                {isRTL ? "متابعة رغم الديون" : "Continuer malgré les dettes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Without Save Warning Modal */}
      {printWithoutSaveWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-100 bg-amber-50 rounded-t-2xl">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Printer size={20} className="text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800">
                  {isRTL ? "تنبيه: العقد غير محفوظ" : "Attention: Contrat non sauvegardé"}
                </p>
                <p className="text-xs text-amber-600">
                  {isRTL ? "هل تريد حفظ العقد قبل الطباعة؟" : "Voulez-vous sauvegarder le contrat avant l'impression ?"}
                </p>
              </div>
              <button onClick={() => setPrintWithoutSaveWarning(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
              <button
                onClick={handlePrintWithoutSave}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {isRTL ? "طباعة بدون حفظ" : "Imprimer sans sauvegarder"}
              </button>
              <button
                onClick={handlePrintWithSave}
                className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
              >
                {isRTL ? "حفظ ثم طباعة" : "Sauvegarder puis imprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
