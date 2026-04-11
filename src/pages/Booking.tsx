import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, Route, Headphones, BadgeDollarSign, Phone, Mail, MapPin,
  Calendar, Search, Car, Users, Clock, Star, ChevronRight, X,
  CheckCircle, Loader2, Fuel, User, FileText, MessageSquare, Menu, Bell
} from "lucide-react";
import type { OnlineBooking } from "../types";

const norm = (s: string) => String(s || "").replace(/\s+/g, "").toUpperCase();
const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

interface FirebaseCarProfile { photo?: string; dailyPrice?: number; color?: string; year?: number; category?: string; }
interface FleetCar { registration: string; brand: string; model: string; fuelType: "Essence" | "Gasoil"; seats: number; photo?: string; dailyPrice: number; color?: string; year?: number; category?: string; }

const DEFAULT_FLEET: FleetCar[] = [
  { registration:"7468TU245", brand:"Kia", model:"Stonic", fuelType:"Essence", seats:5, dailyPrice:80 },
  { registration:"9192TU234", brand:"Renault", model:"Clio", fuelType:"Essence", seats:5, dailyPrice:70 },
  { registration:"5605TU236", brand:"Hyundai", model:"I20", fuelType:"Essence", seats:5, dailyPrice:75 },
  { registration:"5606TU236", brand:"Hyundai", model:"I20", fuelType:"Essence", seats:5, dailyPrice:75 },
  { registration:"8305TU238", brand:"Kia", model:"Rio", fuelType:"Essence", seats:5, dailyPrice:70 },
  { registration:"4485TU240", brand:"VW", model:"Virtus", fuelType:"Essence", seats:5, dailyPrice:90 },
  { registration:"4486TU240", brand:"VW", model:"Virtus", fuelType:"Essence", seats:5, dailyPrice:90 },
  { registration:"2526TU242", brand:"MG", model:"ZS", fuelType:"Essence", seats:5, dailyPrice:95 },
  { registration:"2532TU242", brand:"MG", model:"ZS", fuelType:"Essence", seats:5, dailyPrice:95 },
  { registration:"1389TU244", brand:"Seat", model:"Ibiza", fuelType:"Essence", seats:5, dailyPrice:75 },
  { registration:"1162TU245", brand:"Renault", model:"Clio", fuelType:"Essence", seats:5, dailyPrice:70 },
  { registration:"2504TU246", brand:"Hyundai", model:"I20", fuelType:"Essence", seats:5, dailyPrice:75 },
  { registration:"2508TU246", brand:"Hyundai", model:"I20", fuelType:"Essence", seats:5, dailyPrice:75 },
  { registration:"4912TU246", brand:"Kia", model:"Stonic", fuelType:"Essence", seats:5, dailyPrice:80 },
  { registration:"203TU248", brand:"Seat", model:"Ibiza", fuelType:"Essence", seats:5, dailyPrice:75 },
  { registration:"201TU248", brand:"Seat", model:"Ibiza", fuelType:"Essence", seats:5, dailyPrice:75 },
  { registration:"1958TU248", brand:"Mahindra", model:"XUV", fuelType:"Gasoil", seats:7, dailyPrice:110 },
  { registration:"1959TU248", brand:"Mahindra", model:"KUV300", fuelType:"Gasoil", seats:6, dailyPrice:100 },
  { registration:"1945TU251", brand:"Suzuki", model:"Swift", fuelType:"Essence", seats:5, dailyPrice:70 },
  { registration:"5941TU251", brand:"Renault", model:"Clio", fuelType:"Essence", seats:5, dailyPrice:70 },
  { registration:"5943TU251", brand:"Renault", model:"Clio", fuelType:"Essence", seats:5, dailyPrice:70 },
  { registration:"7138TU251", brand:"Seat", model:"Ibiza", fuelType:"Essence", seats:5, dailyPrice:75 },
  { registration:"7057TU252", brand:"Kia", model:"Picanto", fuelType:"Essence", seats:5, dailyPrice:65 },
  { registration:"9601TU252", brand:"Skoda", model:"Kushaq", fuelType:"Essence", seats:5, dailyPrice:95 },
  { registration:"9603TU252", brand:"Skoda", model:"Kushaq", fuelType:"Essence", seats:5, dailyPrice:95 },
  { registration:"3541TU253", brand:"VW", model:"Virtus", fuelType:"Essence", seats:5, dailyPrice:90 },
  { registration:"7378TU254", brand:"VW", model:"T-Cross", fuelType:"Essence", seats:5, dailyPrice:100 },
  { registration:"7379TU254", brand:"VW", model:"T-Cross", fuelType:"Essence", seats:5, dailyPrice:100 },
  { registration:"7360TU255", brand:"Citroen", model:"Berlingo", fuelType:"Gasoil", seats:5, dailyPrice:90 },
  { registration:"6155TU259", brand:"Seat", model:"Ibiza", fuelType:"Essence", seats:5, dailyPrice:75 },
];

type LangKey = "fr" | "ar" | "en";
const T: Record<LangKey, Record<string, string>> = {
  fr: {
    heroTitle: "Louez votre voiture à Kélibia",
    heroSub: "La meilleure flotte de véhicules au meilleur prix - disponible 7j/7",
    badge: "Réservation en ligne disponible",
    vehicles: "30+ Véhicules",
    years: "10+ Ans d'expérience",
    satisfaction: "99% Satisfaction",
    pickupDate: "Date de départ",
    returnDate: "Date de retour",
    search: "Rechercher les véhicules disponibles",
    fleetTitle: "Notre Flotte",
    fleetSub: "Des véhicules récents, bien entretenus et assurés",
    available: "Disponible",
    unavailable: "Indisponible",
    perDay: "/ jour",
    total: "Total",
    deposit: "Caution",
    book: "Réserver",
    showAll: "Voir toute la flotte",
    showLess: "Voir moins",
    whyTitle: "Pourquoi nous choisir ?",
    insurance: "Assurance complète",
    insuranceSub: "Tous nos véhicules sont assurés tous risques",
    km: "KM illimité",
    kmSub: "Roulez sans compter les kilomètres",
    support: "Support 24/7",
    supportSub: "Notre équipe est disponible à toute heure",
    price: "Meilleur prix",
    priceSub: "Tarifs compétitifs garantis",
    ctaTitle: "Prêt à prendre la route ?",
    ctaSub: "Réservez maintenant et profitez de votre séjour à Kélibia",
    ctaBtn: "Réservez maintenant",
    footerDesc: "Location de voitures à Kélibia, Nabeul - Tunisie",
    contact: "Contact",
    address: "Adresse",
    addressVal: "Kélibia, Nabeul, Tunisie",
    modalTitle: "Réserver",
    name: "Nom complet *",
    phone: "Téléphone *",
    email: "Email",
    cin: "CIN",
    addr: "Adresse",
    notes: "Notes",
    confirm: "Confirmer la réservation",
    cancel: "Annuler",
    successTitle: "Réservation envoyée !",
    successMsg: "Nous vous contacterons sous 24h pour confirmer.",
    days: "jours",
    day: "jour",
    namePh: "Votre nom complet",
    phonePh: "Votre numéro de téléphone",
    emailPh: "votre@email.com",
    cinPh: "Numéro CIN",
    addrPh: "Votre adresse",
    notesPh: "Remarques ou demandes spéciales...",
    selectDates: "Sélectionnez des dates pour voir la disponibilité",
    statsRentals: "Locations effectuées",
    statsClients: "Clients satisfaits",
    statsFleet: "Véhicules disponibles",
    statsYears: "Années d'expérience",
    navPhone: "72 208 711",
    loading: "Chargement de la flotte...",
    errorDates: "Veuillez sélectionner des dates valides",
    errorName: "Le nom est requis",
    errorPhone: "Le téléphone est requis",
    submitting: "Envoi en cours...",
    seats: "places",
    howTitle: "Comment ça marche ?",
    step1: "Choisissez vos dates",
    step1Sub: "Sélectionnez la période de location",
    step2: "Trouvez votre véhicule",
    step2Sub: "Parcourez notre flotte disponible",
    step3: "Réservez en ligne",
    step3Sub: "Remplissez le formulaire et confirmez",
    testimonials: "Ils nous font confiance",
    t1Name: "Ahmed B.",
    t1Text: "Service impeccable ! Voiture propre et bien entretenue. Je recommande vivement.",
    t2Name: "Marie L.",
    t2Text: "Excellent rapport qualité-prix. L'équipe est très réactive et professionnelle.",
    t3Name: "Karim M.",
    t3Text: "Location facile et rapide. La voiture était prête à l'heure. Parfait !",
  },
  ar: {
    heroTitle: "استأجر سيارتك في قليبية",
    heroSub: "أفضل أسطول من السيارات بأفضل الأسعار - متاح 7 أيام في الأسبوع",
    badge: "الحجز عبر الإنترنت متاح",
    vehicles: "+30 سيارة",
    years: "+10 سنوات خبرة",
    satisfaction: "99% رضا العملاء",
    pickupDate: "تاريخ الانطلاق",
    returnDate: "تاريخ الإرجاع",
    search: "بحث",
    fleetTitle: "أسطولنا",
    fleetSub: "سيارات حديثة ومصانة ومؤمنة",
    available: "متاحة",
    unavailable: "غير متاحة",
    perDay: "/ يوم",
    total: "المجموع",
    deposit: "الضمان",
    book: "احجز",
    showAll: "عرض كل الأسطول",
    showLess: "عرض أقل",
    whyTitle: "لماذا تختارنا؟",
    insurance: "تأمين شامل",
    insuranceSub: "جميع سياراتنا مؤمنة تأميناً شاملاً",
    km: "كيلومترات غير محدودة",
    kmSub: "تنقل دون حساب الكيلومترات",
    support: "دعم 24/7",
    supportSub: "فريقنا متاح على مدار الساعة",
    price: "أفضل سعر",
    priceSub: "أسعار تنافسية مضمونة",
    ctaTitle: "هل أنت مستعد للانطلاق؟",
    ctaSub: "احجز الآن واستمتع بإقامتك في قليبية",
    ctaBtn: "احجز الآن",
    footerDesc: "تأجير سيارات في قليبية، نابل - تونس",
    contact: "اتصل بنا",
    address: "العنوان",
    addressVal: "قليبية، نابل، تونس",
    modalTitle: "حجز",
    name: "الاسم الكامل *",
    phone: "الهاتف *",
    email: "البريد الإلكتروني",
    cin: "رقم الهوية",
    addr: "العنوان",
    notes: "ملاحظات",
    confirm: "تأكيد الحجز",
    cancel: "إلغاء",
    successTitle: "تم إرسال الحجز!",
    successMsg: "سنتصل بك خلال 24 ساعة للتأكيد.",
    days: "أيام",
    day: "يوم",
    namePh: "اسمك الكامل",
    phonePh: "رقم هاتفك",
    emailPh: "بريدك@الإلكتروني.com",
    cinPh: "رقم بطاقة الهوية",
    addrPh: "عنوانك",
    notesPh: "ملاحظات أو طلبات خاصة...",
    selectDates: "اختر تواريخ لرؤية التوفر",
    statsRentals: "عملية إيجار",
    statsClients: "عميل راضٍ",
    statsFleet: "سيارة متاحة",
    statsYears: "سنوات خبرة",
    navPhone: "72 208 711",
    loading: "جارٍ التحميل...",
    errorDates: "يرجى اختيار تواريخ صحيحة",
    errorName: "الاسم مطلوب",
    errorPhone: "الهاتف مطلوب",
    submitting: "جارٍ الإرسال...",
    seats: "مقاعد",
    howTitle: "كيف يعمل؟",
    step1: "اختر تواريخك",
    step1Sub: "حدد فترة الإيجار",
    step2: "ابحث عن سيارتك",
    step2Sub: "تصفح أسطولنا المتاح",
    step3: "احجز عبر الإنترنت",
    step3Sub: "املأ النموذج وأكد",
    testimonials: "يثقون بنا",
    t1Name: "أحمد ب.",
    t1Text: "خدمة ممتازة! سيارة نظيفة وجيدة الصيانة. أنصح بها بشدة.",
    t2Name: "ماري ل.",
    t2Text: "جودة سعر ممتازة. الفريق سريع الاستجابة ومحترف.",
    t3Name: "كريم م.",
    t3Text: "إيجار سهل وسريع. كانت السيارة جاهزة في الوقت المحدد. رائع!",
  },
  en: {
    heroTitle: "Rent Your Car in Kélibia",
    heroSub: "The best fleet of vehicles at the best price - available 7 days a week",
    badge: "Online booking available",
    vehicles: "30+ Vehicles",
    years: "10+ Years experience",
    satisfaction: "99% Satisfaction",
    pickupDate: "Pickup date",
    returnDate: "Return date",
    search: "Search",
    fleetTitle: "Our Fleet",
    fleetSub: "Recent, well-maintained and insured vehicles",
    available: "Available",
    unavailable: "Unavailable",
    perDay: "/ day",
    total: "Total",
    deposit: "Deposit",
    book: "Book",
    showAll: "View full fleet",
    showLess: "Show less",
    whyTitle: "Why choose us?",
    insurance: "Full insurance",
    insuranceSub: "All our vehicles are fully insured",
    km: "Unlimited KM",
    kmSub: "Drive without counting kilometers",
    support: "24/7 Support",
    supportSub: "Our team is available around the clock",
    price: "Best price",
    priceSub: "Competitive rates guaranteed",
    ctaTitle: "Ready to hit the road?",
    ctaSub: "Book now and enjoy your stay in Kélibia",
    ctaBtn: "Book now",
    footerDesc: "Car rental in Kélibia, Nabeul - Tunisia",
    contact: "Contact",
    address: "Address",
    addressVal: "Kélibia, Nabeul, Tunisia",
    modalTitle: "Book",
    name: "Full name *",
    phone: "Phone *",
    email: "Email",
    cin: "ID number",
    addr: "Address",
    notes: "Notes",
    confirm: "Confirm booking",
    cancel: "Cancel",
    successTitle: "Booking sent!",
    successMsg: "We will contact you within 24h to confirm.",
    days: "days",
    day: "day",
    namePh: "Your full name",
    phonePh: "Your phone number",
    emailPh: "your@email.com",
    cinPh: "ID card number",
    addrPh: "Your address",
    notesPh: "Remarks or special requests...",
    selectDates: "Select dates to see availability",
    statsRentals: "Rentals completed",
    statsClients: "Satisfied clients",
    statsFleet: "Available vehicles",
    statsYears: "Years of experience",
    navPhone: "72 208 711",
    loading: "Loading...",
    errorDates: "Please select valid dates",
    errorName: "Name is required",
    errorPhone: "Phone is required",
    submitting: "Submitting...",
    seats: "seats",
    howTitle: "How does it work?",
    step1: "Choose your dates",
    step1Sub: "Select the rental period",
    step2: "Find your vehicle",
    step2Sub: "Browse our available fleet",
    step3: "Book online",
    step3Sub: "Fill the form and confirm",
    testimonials: "They trust us",
    t1Name: "Ahmed B.",
    t1Text: "Impeccable service! Clean and well-maintained car. Highly recommend.",
    t2Name: "Marie L.",
    t2Text: "Excellent value for money. The team is very responsive and professional.",
    t3Name: "Karim M.",
    t3Text: "Easy and fast rental. The car was ready on time. Perfect!",
  },
};

function today() { return new Date().toISOString().split("T")[0]; }
function daysBetween(a: string, b: string) { return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000)); }
function datesOverlap(s1: string, e1: string, s2: string, e2: string) { return s1 < e2 && e1 > s2; }
function getCarImageKey(reg: string) {
  const r = norm(reg);
  const m = r.match(/^(\d+)(TU)(\d+)$/i);
  if (!m) return "";
  return `${m[3].toLowerCase()}tu${m[1].toLowerCase()}`;
}

function useCountUp(target: number, duration = 1500, trigger = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let cur = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      cur += step;
      if (cur >= target) { setVal(target); clearInterval(timer); }
      else setVal(cur);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, trigger]);
  return val;
}

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function CarImage({ reg, photo, alt }: { reg: string; photo?: string; alt: string }) {
  const key = getCarImageKey(reg);
  const exts = ["jpg", "webp", "png", "svg"];
  const [idx, setIdx] = useState(0);
  const base = photo && (photo.startsWith("http") || photo.startsWith("/"))
    ? photo
    : `/car-images/${key}.${exts[idx]}`;
  const handleError = () => { if (idx < exts.length - 1) setIdx(i => i + 1); };
  return (
    <img
      src={idx === 0 ? base : `/car-images/${key}.${exts[idx]}`}
      alt={alt}
      onError={handleError}
      className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
    />
  );
}

export default function Booking() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<LangKey>("fr");
  const t = T[lang];
  const isRtl = lang === "ar";
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroImg, setHeroImg] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroImg(i => (i + 1) % 6);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [fleet, setFleet] = useState<FleetCar[]>(DEFAULT_FLEET);
  const [busyRegs, setBusyRegs] = useState<Set<string>>(new Set());
  const [contractsData, setContractsData] = useState<Record<string, any>>({});
  const [availLoading, setAvailLoading] = useState(false);
  const [depositPct] = useState(30);
  const [dataLoading, setDataLoading] = useState(true);
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [searched, setSearched] = useState(false);
  const [dateError, setDateError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [modalCar, setModalCar] = useState<FleetCar | null>(null);
  const [notifyModal, setNotifyModal] = useState<{ car: FleetCar; availableFrom: string } | null>(null);
  const [notifyName, setNotifyName] = useState("");
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifySent, setNotifySent] = useState(false);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCin, setFormCin] = useState("");
  const [formAddr, setFormAddr] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(false);

  const fleetRef = useRef<HTMLDivElement>(null);
  const statsObs = useInView();
  const whyObs = useInView();
  const howObs = useInView();

  const rentals = useCountUp(1200, 1500, statsObs.visible);
  const clients = useCountUp(850, 1500, statsObs.visible);
  const fleetCount = useCountUp(30, 1200, statsObs.visible);
  const yearsExp = useCountUp(10, 1000, statsObs.visible);

  // Load Firebase data
  useEffect(() => {
    async function loadData() {
      setDataLoading(true);
      try {
        const [profilesRes, settingsRes] = await Promise.all([
          fetch(`${DB}/car_profiles.json`),
          fetch(`${DB}/booking_settings.json`),
        ]);
        const profiles: Record<string, FirebaseCarProfile> | null = profilesRes.ok ? await profilesRes.json() : null;
        const settings: { depositPct?: number } | null = settingsRes.ok ? await settingsRes.json() : null;
        void settings;

        if (profiles) {
          setFleet(DEFAULT_FLEET.map(car => {
            const key = norm(car.registration);
            const p = profiles[key] || profiles[car.registration] || null;
            if (!p) return car;
            return {
              ...car,
              photo: p.photo || car.photo,
              dailyPrice: p.dailyPrice || car.dailyPrice,
              color: p.color || car.color,
              year: p.year || car.year,
              category: p.category || car.category,
            };
          }));
        }
      } catch {
        // silently fall back to DEFAULT_FLEET
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
  }, []);

  // Check availability
  const checkAvailability = useCallback(async (pickup: string, ret: string) => {
    try {
      const [contractsRes, bookingsRes] = await Promise.all([
        fetch(`${DB}/contracts.json?orderBy=%22%24key%22&limitToLast=500`),
        fetch(`${DB}/bookings.json`),
      ]);
      const contracts = contractsRes.ok ? await contractsRes.json() : null;
      const bookings = bookingsRes.ok ? await bookingsRes.json() : null;
      if (contracts) setContractsData(contracts);
      const busy = new Set<string>();

      console.log("Checking availability for:", pickup, "to", ret);

      // Check contracts
      if (contracts) {
        Object.values(contracts as Record<string, any>).forEach(item => {
          if (!item || item._deleted) return;
          // Exclude cancelled contracts (both English and Arabic)
          const status = item.status || item["حالة"] || "";
          if (status === "cancelled" || status === "rejected" || status === "ملغى" || status === "مرفوض") {
            console.log("Skipping cancelled contract:", item.registration, "status:", status);
            return;
          }
          const reg = norm(item.registration || item["رقم اللوحة"] || "");
          // Support both new (departureDate/returnDate) and old Arabic field names
          const s = item.departureDate || item["يوم الانطلاق"] || "";
          const e = item.returnDate || item["يوم الرجوع"] || "";
          if (reg && s && e && datesOverlap(pickup, ret, s, e)) {
            console.log("Contract makes car busy:", reg, "from", s, "to", e);
            busy.add(reg);
          }
        });
      }

      // Check online bookings (only pending/confirmed)
      if (bookings) {
        Object.values(bookings as Record<string, any>).forEach(item => {
          if (!item) return;
          const status = item.status || "";
          if (status === "cancelled" || status === "rejected" || status === "ملغى" || status === "مرفوض") {
            console.log("Skipping cancelled booking:", item.registration, "status:", status);
            return;
          }
          const reg = norm(item.registration || "");
          const s = item.startDate || "";
          const e = item.endDate || "";
          if (reg && s && e && datesOverlap(pickup, ret, s, e)) {
            console.log("Booking makes car busy:", reg, "from", s, "to", e);
            busy.add(reg);
          }
        });
      }

      console.log("Busy registrations:", Array.from(busy));
      setBusyRegs(busy);
    } catch {
      setBusyRegs(new Set());
    } finally {
      setAvailLoading(false);
    }
  }, [pickupDate, returnDate]);

  // Handle search - scroll immediately, fetch availability in background
  const handleSearch = async () => {
    setDateError("");
    if (!pickupDate || !returnDate || pickupDate >= returnDate || pickupDate < today()) {
      setDateError(t.errorDates);
      return;
    }
    // Scroll immediately
    setSearched(true);
    fleetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Fetch availability in background
    setAvailLoading(true);
    checkAvailability(pickupDate, returnDate);
  };

  // Get next available date for a busy car
  async function getAvailableFrom(registration: string): Promise<string> {
    const reg = norm(registration);
    let maxReturn = "";

    // If contractsData not loaded yet, fetch it
    let data = contractsData;
    if (Object.keys(data).length === 0) {
      try {
        const res = await fetch(`${DB}/contracts.json?orderBy=%22%24key%22&limitToLast=500`);
        if (res.ok) { data = await res.json(); setContractsData(data); }
      } catch {}
    }

    // Check contracts
    Object.values(data).forEach((item: any) => {
      if (!item || item._deleted) return;
      const r = norm(item.registration || item["رقم اللوحة"] || "");
      if (r !== reg) return;
      const e = item.returnDate || item["يوم الرجوع"] || "";
      if (e >= today() && e > maxReturn) maxReturn = e;
    });

    // Also check online bookings
    try {
      const bookingsRes = await fetch(`${DB}/bookings.json`);
      const bookings = bookingsRes.ok ? await bookingsRes.json() : null;
      if (bookings) {
        Object.values(bookings as Record<string, any>).forEach((item: any) => {
          if (!item) return;
          if (item.status === "cancelled" || item.status === "rejected") return;
          const r = norm(item.registration || "");
          if (r !== reg) return;
          const e = item.endDate || "";
          if (e >= today() && e > maxReturn) maxReturn = e;
        });
      }
    } catch {}

    return maxReturn;
  }

  // Handle submit - redirect to payment page
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!formName.trim()) errs.name = t.errorName;
    if (!formPhone.trim()) errs.phone = t.errorPhone;
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});

    const numDays = pickupDate && returnDate ? daysBetween(pickupDate, returnDate) : 1;
    const totalAmount = modalCar ? numDays * modalCar.dailyPrice : 0;
    const depositAmount = Math.ceil(totalAmount * depositPct / 100);

    // Build booking payload and navigate to payment
    const bookingData = {
      clientName: formName,
      clientPhone: formPhone,
      clientEmail: formEmail || undefined,
      clientCin: formCin || undefined,
      clientAddress: formAddr || undefined,
      notes: formNotes || undefined,
      registration: modalCar?.registration ?? "",
      brand: modalCar?.brand ?? "",
      model: modalCar?.model ?? "",
      photo: modalCar?.photo,
      dailyPrice: modalCar?.dailyPrice ?? 0,
      startDate: pickupDate,
      endDate: returnDate,
      days: numDays,
      totalAmount,
      depositAmount,
      lang,
    };

    setModalCar(null);
    navigate("/payment", { state: { booking: bookingData } });
  };

  const days = pickupDate && returnDate ? daysBetween(pickupDate, returnDate) : 1;
  const visibleFleet = showAll ? fleet : fleet.slice(0, 6);

  const fadeIn = (v: boolean) =>
    `transition-all duration-700 ${v ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white font-sans antialiased">

      {/* Navbar */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white border-b border-gray-100 shadow-md h-16" : "bg-transparent h-20"}`}>
        <div className="max-w-7xl mx-auto px-8 h-full flex items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <img
              src="/logo.png"
              alt="Palma"
              className={`w-auto object-contain transition-all duration-300 ${scrolled ? "h-10" : "h-12"}`}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>

          {/* Nav links - desktop */}
          <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
            {[
              { label: lang === "fr" ? "Accueil" : lang === "ar" ? "الرئيسية" : "Home", href: "#" },
              { label: lang === "fr" ? "Rechercher" : lang === "ar" ? "بحث" : "Search", href: "#search" },
              { label: lang === "fr" ? "Nos Voitures" : lang === "ar" ? "سياراتنا" : "Our Cars", href: "#fleet" },
              { label: lang === "fr" ? "À Propos" : lang === "ar" ? "من نحن" : "About", href: "#why" },
              { label: lang === "fr" ? "Contact" : lang === "ar" ? "اتصل بنا" : "Contact", href: "#contact" },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={e => {
                  e.preventDefault();
                  if (link.href === "#fleet") fleetRef.current?.scrollIntoView({ behavior: "smooth" });
                  else if (link.href === "#search") document.getElementById("search-section")?.scrollIntoView({ behavior: "smooth" });
                  else if (link.href === "#why") document.getElementById("why")?.scrollIntoView({ behavior: "smooth" });
                  else if (link.href === "#footer") document.getElementById("site-footer")?.scrollIntoView({ behavior: "smooth" });
                  else if (link.href === "#contact") document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                  else window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`text-sm font-medium transition-colors whitespace-nowrap hover:text-green-500 ${scrolled ? "text-gray-600" : "text-white drop-shadow"}`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Phone */}
            <a
              href={`tel:${t.navPhone.replace(/\s/g, "")}`}
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${scrolled ? "border-gray-200 text-gray-700 hover:border-green-500 hover:text-green-600" : "border-white/40 text-white hover:border-white bg-white/10"}`}
            >
              <Phone size={14} /> {t.navPhone}
            </a>

            {/* Language dropdown */}
            <div className="hidden md:block relative group">
              <button className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${scrolled ? "border-gray-200 text-gray-700 hover:border-green-400 bg-white" : "border-white/40 text-white bg-white/10 hover:bg-white/20"}`}>
                <span>{lang === "fr" ? "🇫🇷" : lang === "ar" ? "🇹🇳" : "🇬🇧"}</span>
                <span className="uppercase">{lang}</span>
                <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full mt-1 right-0 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 min-w-[130px]">
                {([["fr", "🇫🇷", "Français"], ["ar", "🇹🇳", "العربية"], ["en", "🇬🇧", "English"]] as [LangKey, string, string][]).map(([l, flag, name]) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-green-50 transition-colors ${lang === l ? "text-green-600 font-bold bg-green-50" : "text-gray-700"}`}
                  >
                    <span>{flag}</span> {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Login button */}
            <a
              href="/login"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${scrolled ? "bg-green-500 hover:bg-green-600 text-white" : "bg-white text-green-600 hover:bg-green-50"}`}
            >
              <User size={14} />
              {lang === "fr" ? "Connexion" : lang === "ar" ? "دخول" : "Login"}
            </a>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className={`md:hidden p-1 ${scrolled ? "text-gray-700" : "text-white"}`}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3">
            {(["fr", "ar", "en"] as LangKey[]).map(l => (
              <button
                key={l}
                onClick={() => { setLang(l); setMobileMenu(false); }}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase mr-2 ${lang === l ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"}`}
              >
                {l}
              </button>
            ))}
            <a href="/login" className="block bg-green-500 text-white text-center py-2 rounded-lg text-sm font-bold mt-2">
              {lang === "fr" ? "Connexion" : lang === "ar" ? "تسجيل الدخول" : "Login"}
            </a>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative pt-16 min-h-screen flex flex-col justify-between overflow-hidden">
        <div className="absolute inset-0">
          {/* Slideshow background */}
          {[
            "/car-images/254tu7378.png",
            "/car-images/254tu7379.png",
            "/car-images/252tu9601.jpg",
            "/car-images/246tu4912.png",
            "/car-images/253tu3541.jpg",
            "/car-images/238tu8305.jpg",
          ].map((src, i) => (
            <img
              key={src}
              src={src}
              alt="hero car"
              className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-opacity duration-1000"
              style={{ opacity: heroImg === i ? 1 : 0 }}
            />
          ))}
          <div className="absolute inset-0 bg-black/55" />
        </div>

        <div className="relative flex-1 flex items-center justify-center px-6 py-20">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-sm px-4 py-1.5 rounded-full mb-8">
              <CheckCircle size={14} className="text-green-400" /> {t.badge}
            </div>

            {/* Title */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-4">
              {lang === "fr" && <>Trouvez la voiture<br /><span className="text-green-400">qu'il vous faut</span></>}
              {lang === "ar" && <>ابحث عن السيارة<br /><span className="text-green-400">التي تناسبك</span></>}
              {lang === "en" && <>Find the car<br /><span className="text-green-400">you need</span></>}
            </h1>

            {/* Subtitle */}
            <p className="text-white/80 text-lg mb-2">{t.heroSub}</p>
            <p className="text-green-400 font-semibold text-base mb-8">
              {lang === "fr" && "Disponible quand vous en avez besoin."}
              {lang === "ar" && "متاح عندما تحتاجه."}
              {lang === "en" && "Available whenever you need it."}
            </p>

            {/* Feature badges */}
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {[
                { icon: Shield, label: lang === "fr" ? "Assurance comprise" : lang === "ar" ? "تأمين شامل" : "Insurance included" },
                { icon: Route, label: lang === "fr" ? "Sans limite de km" : lang === "ar" ? "كيلومترات غير محدودة" : "Unlimited km" },
                { icon: Headphones, label: lang === "fr" ? "On répond à vos questions" : lang === "ar" ? "نجيب على أسئلتك" : "We answer your questions" },
              ].map(b => (
                <span key={b.label} className="flex items-center gap-2 bg-white/10 border border-white/25 text-white text-sm px-4 py-2 rounded-full backdrop-blur-sm">
                  <b.icon size={14} className="text-green-400" /> {b.label}
                </span>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap justify-center gap-4 mb-16">
              <button
                onClick={() => fleetRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-green-500/30 text-base"
              >
                <Search size={18} />
                {lang === "fr" ? "Chercher une voiture →" : lang === "ar" ? "ابحث عن سيارة ←" : "Search a car →"}
              </button>
              <button
                onClick={() => fleetRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-8 py-3.5 rounded-xl transition-all backdrop-blur-sm text-base"
              >
                <Car size={18} />
                {lang === "fr" ? "Découvrir nos modèles" : lang === "ar" ? "اكتشف سياراتنا" : "Discover our models"}
              </button>
            </div>
          </div>
        </div>

        {/* Stats bar at bottom */}
        <div className="relative bg-black/30 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-3xl mx-auto px-6 py-6 grid grid-cols-3 gap-4 text-center">
            {[
              { val: "30+", label: lang === "fr" ? "Véhicules" : lang === "ar" ? "سيارة" : "Vehicles" },
              { val: "1K+", label: lang === "fr" ? "Clients" : lang === "ar" ? "عميل" : "Clients" },
              { val: "99%", label: lang === "fr" ? "Satisfaction" : lang === "ar" ? "رضا العملاء" : "Satisfaction" },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-2xl py-4 px-2">
                <div className="text-3xl font-black text-green-400 mb-1">{s.val}</div>
                <div className="text-white/70 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section id="search-section" className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
              <Search size={12} />
              {lang === "fr" ? "Recherche Rapide" : lang === "ar" ? "بحث سريع" : "Quick Search"}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-2">
              {lang === "fr" && <>Trouvez votre <span className="text-green-500">voiture idéale</span></>}
              {lang === "ar" && <>ابحث عن <span className="text-green-500">سيارتك المثالية</span></>}
              {lang === "en" && <>Find your <span className="text-green-500">ideal car</span></>}
            </h2>
            <p className="text-gray-500 text-sm">
              {lang === "fr" ? "Réservez en quelques clics et partez à l'aventure"
                : lang === "ar" ? "احجز في بضع نقرات وانطلق في مغامرتك"
                : "Book in a few clicks and start your adventure"}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <div className="grid sm:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                  <Calendar size={14} className="text-green-500" /> {t.pickupDate}
                </label>
                <input
                  type="date"
                  min={today()}
                  value={pickupDate}
                  onChange={e => setPickupDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                  <Calendar size={14} className="text-green-500" /> {t.returnDate}
                </label>
                <input
                  type="date"
                  min={pickupDate || today()}
                  value={returnDate}
                  onChange={e => setReturnDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                />
              </div>
            </div>
            {dateError && (
              <p className="text-red-500 text-sm mb-4 flex items-center gap-1">
                <X size={14} /> {dateError}
              </p>
            )}
            <button
              onClick={handleSearch}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition-all text-base shadow-md shadow-green-500/20 flex items-center justify-center gap-2"
            >
              <Search size={18} />
              {lang === "fr" ? "Rechercher ma voiture →" : lang === "ar" ? "← ابحث عن سيارتي" : "Search my car →"}
            </button>
            <p className="text-center text-gray-400 text-xs mt-3">
              {lang === "fr" ? "Réservation instantanée • Annulation gratuite • Meilleur prix garanti"
                : lang === "ar" ? "حجز فوري • إلغاء مجاني • أفضل سعر مضمون"
                : "Instant booking • Free cancellation • Best price guaranteed"}
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section ref={howObs.ref} className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className={`text-3xl font-black text-gray-900 text-center mb-14 ${fadeIn(howObs.visible)}`}>{t.howTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Calendar, title: t.step1, sub: t.step1Sub, num: "01" },
              { icon: Car, title: t.step2, sub: t.step2Sub, num: "02" },
              { icon: CheckCircle, title: t.step3, sub: t.step3Sub, num: "03" },
            ].map(step => (
              <div key={step.num} className={`text-center ${fadeIn(howObs.visible)}`}>
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 mb-4">
                  <step.icon size={28} className="text-green-600" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow">{step.num}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm">{step.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fleet */}
      <section ref={fleetRef} className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-2">{t.fleetTitle}</h2>
            <p className="text-gray-500">{t.fleetSub}</p>
            {searched && (
              <button
                onClick={() => { setAvailLoading(true); checkAvailability(pickupDate, returnDate); }}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-full transition-colors">
                {availLoading
                  ? <><Loader2 size={11} className="animate-spin" /> {lang === "fr" ? "Vérification..." : lang === "ar" ? "جاري التحقق..." : "Checking..."}</>
                  : <><Search size={11} /> {lang === "fr" ? "Actualiser la disponibilité" : lang === "ar" ? "تحديث التوفر" : "Refresh availability"}</>}
              </button>
            )}
          </div>
          {dataLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <Loader2 size={32} className="animate-spin text-green-500" />
              <span className="text-lg">{t.loading}</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleFleet.map(car => {
                  const isAvailable = searched ? !busyRegs.has(norm(car.registration)) : true;
                  const total = days * car.dailyPrice;
                  const deposit = Math.ceil(total * depositPct / 100);
                  return (
                    <div key={car.registration} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-green-300 transition-all duration-300 overflow-hidden flex flex-col">
                      <div className="relative bg-gray-100 overflow-hidden">
                        <CarImage reg={car.registration} photo={car.photo} alt={`${car.brand} ${car.model}`} />
                        {searched && (
                          <span className={`absolute top-3 ${isRtl ? "left-3" : "right-3"} text-xs font-bold px-3 py-1 rounded-full shadow-lg ${isAvailable ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
                            {isAvailable ? t.available : t.unavailable}
                          </span>
                        )}
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <h3 className="font-bold text-gray-900 text-lg mb-2">{car.brand} {car.model}</h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {car.year && <span className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full"><Clock size={10} /> {car.year}</span>}
                          {car.color && <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">{car.color}</span>}
                          <span className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full"><Fuel size={10} /> {car.fuelType}</span>
                          <span className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full"><Users size={10} /> {car.seats} {t.seats}</span>
                        </div>
                        <div className="mt-auto">
                          <div className="flex items-end justify-between mb-3">
                            <span className="text-2xl font-black text-green-600">{car.dailyPrice} <span className="text-sm font-normal text-gray-500">TND{t.perDay}</span></span>
                          </div>
                          {searched && (
                            <div className="text-xs text-gray-500 mb-3 space-y-0.5">
                              <div>{t.total}: <span className="font-semibold text-gray-800">{total} TND</span> ({days} {days > 1 ? t.days : t.day})</div>
                              <div>{t.deposit}: <span className="font-semibold text-gray-800">{deposit} TND</span></div>
                            </div>
                          )}
                          <button
                            disabled={!searched}
                            onClick={async () => {
                              console.log("Button clicked, isAvailable:", isAvailable, "searched:", searched);
                              if (isAvailable) {
                                setModalCar(car);
                              } else if (searched) {
                                const availFrom = await getAvailableFrom(car.registration);
                                setNotifyModal({ car, availableFrom: availFrom });
                                setNotifyName(""); setNotifyPhone(""); setNotifySent(false);
                              }
                            }}
                            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${searched && !isAvailable ? "bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 cursor-pointer" : !searched ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md shadow-green-500/20 hover:shadow-green-500/40"}`}
                          >
                            {searched && !isAvailable
                              ? <><Bell size={14} /> {lang === "fr" ? "Me notifier" : lang === "ar" ? "أشعرني" : "Notify me"}</>
                              : <><Car size={14} /> {t.book}</>
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {fleet.length > 6 && (
                <div className="text-center mt-10">
                  <button
                    onClick={() => setShowAll(v => !v)}
                    className="border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white font-bold px-8 py-3 rounded-xl transition-all"
                  >
                    {showAll ? t.showLess : t.showAll}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Why Choose Us */}
      <section ref={whyObs.ref} id="why" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-gray-900 mb-3">
              {lang === "fr" && <>Pourquoi Choisir <span className="text-green-500">Palma</span> ?</>}
              {lang === "ar" && <>لماذا تختار <span className="text-green-500">بالما</span>؟</>}
              {lang === "en" && <>Why Choose <span className="text-green-500">Palma</span>?</>}
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
              {lang === "fr"
                ? "Une décennie d'excellence au service de votre mobilité. Nous ne louons pas seulement des voitures, nous créons des expériences de voyage sur mesure."
                : lang === "ar"
                ? "عقد من التميز في خدمة تنقلك. لا نؤجر السيارات فحسب، بل نصنع تجارب سفر استثنائية."
                : "A decade of excellence at the service of your mobility. We don't just rent cars, we create tailor-made travel experiences."}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Car image */}
            <div className={`relative rounded-3xl overflow-hidden shadow-2xl ${fadeIn(whyObs.visible)}`}>
              <img
                src="/car-images/246tu4912.png"
                alt="Palma fleet"
                className="w-full h-80 object-cover"
                onError={e => { (e.target as HTMLImageElement).src = "/car-images/254tu7378.png"; }}
              />
              <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />
              <div className="absolute top-4 left-4 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
                ✓ {lang === "fr" ? "Flotte certifiée" : lang === "ar" ? "أسطول معتمد" : "Certified fleet"}
              </div>
            </div>

            {/* Right side */}
            <div className={fadeIn(whyObs.visible)}>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {lang === "fr" ? "L'Excellence à Votre Service" : lang === "ar" ? "التميز في خدمتك" : "Excellence at Your Service"}
              </h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                {lang === "fr"
                  ? "Chez Palma, nous croyons que chaque voyage mérite le meilleur. C'est pourquoi nous nous engageons à fournir des véhicules de qualité supérieure et un service client exceptionnel."
                  : lang === "ar"
                  ? "في بالما، نؤمن أن كل رحلة تستحق الأفضل. لهذا نلتزم بتقديم سيارات عالية الجودة وخدمة عملاء استثنائية."
                  : "At Palma, we believe every journey deserves the best. That's why we commit to providing top-quality vehicles and exceptional customer service."}
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    icon: Shield,
                    title: lang === "fr" ? "Véhicules Certifiés" : lang === "ar" ? "سيارات معتمدة" : "Certified Vehicles",
                    sub: lang === "fr" ? "Tous nos véhicules sont certifiés, régulièrement entretenus et inspectés pour garantir votre sécurité."
                      : lang === "ar" ? "جميع سياراتنا معتمدة ومصانة بانتظام."
                      : "All our vehicles are certified and regularly maintained.",
                    color: "bg-blue-100 text-blue-600",
                  },
                  {
                    icon: Clock,
                    title: lang === "fr" ? "Service 24/7" : lang === "ar" ? "خدمة 24/7" : "24/7 Service",
                    sub: lang === "fr" ? "Assistance routière et service client disponibles 24 heures sur 24, 7 jours sur 7."
                      : lang === "ar" ? "مساعدة على الطريق وخدمة عملاء متاحة 24/7."
                      : "Roadside assistance and customer service available 24/7.",
                    color: "bg-green-100 text-green-600",
                  },
                  {
                    icon: Star,
                    title: lang === "fr" ? "Excellence Reconnue" : lang === "ar" ? "تميز معترف به" : "Recognized Excellence",
                    sub: lang === "fr" ? "Primé pour notre service exceptionnel et notre engagement envers nos clients."
                      : lang === "ar" ? "حائزون على جوائز لخدمتنا الاستثنائية."
                      : "Awarded for our exceptional service and commitment to clients.",
                    color: "bg-purple-100 text-purple-600",
                  },
                  {
                    icon: Search,
                    title: lang === "fr" ? "Réservation Instantanée" : lang === "ar" ? "حجز فوري" : "Instant Booking",
                    sub: lang === "fr" ? "Réservez votre véhicule en quelques clics avec notre système de réservation rapide."
                      : lang === "ar" ? "احجز سيارتك في بضع نقرات."
                      : "Book your vehicle in a few clicks with our fast booking system.",
                    color: "bg-green-100 text-green-600",
                  },
                ].map(card => (
                  <div key={card.title} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-green-200 hover:shadow-sm transition-all">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${card.color.split(" ")[0]}`}>
                      <card.icon size={18} className={card.color.split(" ")[1]} />
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{card.title}</h4>
                    <p className="text-gray-500 text-xs leading-relaxed">{card.sub}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => fleetRef.current?.scrollIntoView({ behavior: "smooth" })}
                className="mt-6 bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
              >
                {lang === "fr" ? "Découvrir Notre Histoire" : lang === "ar" ? "اكتشف قصتنا" : "Discover Our Story"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section ref={statsObs.ref} className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img src="/car-images/252tu9601.jpg" alt="stats bg" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-black/75" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { val: rentals, label: t.statsRentals, icon: Car },
              { val: clients, label: t.statsClients, icon: Users },
              { val: fleetCount, label: t.statsFleet, icon: Route },
              { val: yearsExp, label: t.statsYears, icon: Clock },
            ].map(s => (
              <div key={s.label} className={`p-6 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm ${fadeIn(statsObs.visible)}`}>
                <s.icon size={24} className="text-green-400 mx-auto mb-3" />
                <div className="text-4xl font-black text-white mb-1">{s.val}+</div>
                <div className="text-slate-300 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-green-600 via-green-500 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYtMmgtNHY2aDR2LTR6bS0xMi0yaDJ2MmgtMnYtMnptLTQtNGg0djRoLTR2LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black text-white mb-3">{t.ctaTitle}</h2>
          <p className="text-green-100 mb-8">{t.ctaSub}</p>
          <button
            onClick={() => fleetRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="bg-white hover:bg-gray-100 text-green-600 font-bold px-10 py-4 rounded-xl text-lg transition-all shadow-lg shadow-white/20 flex items-center gap-2 mx-auto"
          >
            <ChevronRight size={20} /> {t.ctaBtn}
          </button>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3">
              {lang === "fr" && <>Restons en <span className="text-green-500">Contact</span></>}
              {lang === "ar" && <>تواصل <span className="text-green-500">معنا</span></>}
              {lang === "en" && <>Get in <span className="text-green-500">Touch</span></>}
            </h2>
            <p className="text-gray-500 text-sm">
              {lang === "fr" ? "Notre équipe d'experts est à votre écoute 24/7"
              : lang === "ar" ? "فريقنا من الخبراء في خدمتك على مدار الساعة"
              : "Our team of experts is available 24/7 for you"}
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-10">
            {/* Info */}
            <div className="space-y-6">
              {[
                { icon: MapPin, title: lang === "fr" ? "Notre Adresse" : lang === "ar" ? "عنواننا" : "Our Address", val: "Avenue du Tunis, Kélibia 8090", sub: lang === "fr" ? "Centre-ville, Kélibia" : lang === "ar" ? "وسط المدينة، قليبية" : "City center, Kélibia" },
                { icon: Phone, title: lang === "fr" ? "Téléphone" : lang === "ar" ? "الهاتف" : "Phone", val: "72 208 711 / 22 843 531", sub: lang === "fr" ? "Disponible 24h/24" : lang === "ar" ? "متاح 24 ساعة" : "Available 24/7" },
                { icon: Mail, title: lang === "fr" ? "Email" : lang === "ar" ? "البريد الإلكتروني" : "Email", val: "ste.palmacar@gmail.com", sub: lang === "fr" ? "Réponse sous 24h" : lang === "ar" ? "رد خلال 24 ساعة" : "Response within 24h" },
                { icon: Clock, title: lang === "fr" ? "Horaires" : lang === "ar" ? "أوقات العمل" : "Hours", val: lang === "fr" ? "Lun - Dim: 24h/24" : lang === "ar" ? "الاثنين - الأحد: 24 ساعة" : "Mon - Sun: 24/7", sub: lang === "fr" ? "Service non-stop" : lang === "ar" ? "خدمة مستمرة" : "Non-stop service" },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <item.icon size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                    <p className="text-gray-700 text-sm">{item.val}</p>
                    <p className="text-gray-400 text-xs">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Form */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1.5">
                    {lang === "fr" ? "Nom Complet" : lang === "ar" ? "الاسم الكامل" : "Full Name"}
                  </label>
                  <input type="text" placeholder={lang === "fr" ? "Votre nom complet" : lang === "ar" ? "اسمك الكامل" : "Your full name"}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1.5">
                    {lang === "fr" ? "Adresse Email" : lang === "ar" ? "البريد الإلكتروني" : "Email Address"}
                  </label>
                  <input type="email" placeholder="votre@email.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1.5">
                    {lang === "fr" ? "Votre Message" : lang === "ar" ? "رسالتك" : "Your Message"}
                  </label>
                  <textarea rows={5} placeholder={lang === "fr" ? "Parlez-nous de votre projet, vos besoins, vos questions..." : lang === "ar" ? "أخبرنا عن احتياجاتك وأسئلتك..." : "Tell us about your needs and questions..."}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-none" />
                </div>
                <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                  <Mail size={16} />
                  {lang === "fr" ? "Envoyer le Message" : lang === "ar" ? "إرسال الرسالة" : "Send Message"}
                </button>
                <p className="text-center text-gray-400 text-xs">
                  {lang === "fr" ? "Toutes vos informations sont sécurisées et confidentielles"
                  : lang === "ar" ? "جميع معلوماتك آمنة وسرية"
                  : "All your information is secure and confidential"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners / Brands */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900 mb-3">
              {lang === "fr" && <>Nos Partenaires <span className="text-green-500">de Confiance</span></>}
              {lang === "ar" && <>شركاؤنا <span className="text-green-500">الموثوقون</span></>}
              {lang === "en" && <>Our Trusted <span className="text-green-500">Partners</span></>}
            </h2>
            <p className="text-gray-500 text-sm max-w-lg mx-auto">
              {lang === "fr" ? "Nous collaborons avec les plus grandes marques automobiles pour vous offrir une flotte diversifiée et de qualité supérieure."
              : lang === "ar" ? "نتعاون مع أكبر ماركات السيارات لنقدم لك أسطولاً متنوعاً وعالي الجودة."
              : "We collaborate with the biggest car brands to offer you a diverse and high-quality fleet."}
            </p>
          </div>

          {/* Awards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-12">
            {[
              { icon: Star, title: lang === "fr" ? "Meilleur Service" : lang === "ar" ? "أفضل خدمة" : "Best Service", sub: lang === "fr" ? "Prix National 2023" : lang === "ar" ? "جائزة وطنية 2023" : "National Award 2023", bg: "bg-yellow-50", color: "text-yellow-500" },
              { icon: Shield, title: lang === "fr" ? "Sécurité Garantie" : lang === "ar" ? "أمان مضمون" : "Safety Guaranteed", sub: lang === "fr" ? "Certification ISO" : lang === "ar" ? "شهادة ISO" : "ISO Certification", bg: "bg-blue-50", color: "text-blue-500" },
              { icon: CheckCircle, title: lang === "fr" ? "5 Étoiles" : lang === "ar" ? "5 نجوم" : "5 Stars", sub: lang === "fr" ? "Satisfaction Client" : lang === "ar" ? "رضا العملاء" : "Client Satisfaction", bg: "bg-purple-50", color: "text-purple-500" },
              { icon: Users, title: lang === "fr" ? "Partenaire Officiel" : lang === "ar" ? "شريك رسمي" : "Official Partner", sub: lang === "fr" ? "Constructeurs" : lang === "ar" ? "المصنّعون" : "Manufacturers", bg: "bg-green-50", color: "text-green-500" },
            ].map(a => (
              <div key={a.title} className="text-center">
                <div className={`w-14 h-14 rounded-2xl ${a.bg} flex items-center justify-center mx-auto mb-3`}>
                  <a.icon size={26} className={a.color} />
                </div>
                <p className="font-bold text-gray-900 text-sm">{a.title}</p>
                <p className="text-gray-400 text-xs">{a.sub}</p>
              </div>
            ))}
          </div>

          {/* Brand logos */}
          <div className="flex flex-wrap justify-center items-center gap-4">
            {["Kia", "Hyundai", "Renault", "Seat", "Volkswagen", "Skoda", "MG", "Suzuki", "Citroen", "Mahindra"].map(brand => (
              <div key={brand} className="bg-white border border-gray-100 rounded-xl px-5 py-3 shadow-sm hover:shadow-md hover:border-green-200 transition-all">
                <span className="text-gray-700 font-bold text-sm">{brand}</span>
              </div>
            ))}
          </div>

          {/* Bottom stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 text-center">
            {[
              { val: "10+", label: lang === "fr" ? "Marques Partenaires" : lang === "ar" ? "ماركات شريكة" : "Partner Brands" },
              { val: "30+", label: lang === "fr" ? "Véhicules Disponibles" : lang === "ar" ? "سيارة متاحة" : "Available Vehicles" },
              { val: "10+", label: lang === "fr" ? "Années d'Expérience" : lang === "ar" ? "سنوات خبرة" : "Years Experience" },
              { val: "99%", label: lang === "fr" ? "Satisfaction Client" : lang === "ar" ? "رضا العملاء" : "Client Satisfaction" },
            ].map(s => (
              <div key={s.label}>
                <div className="text-3xl font-black text-green-500 mb-1">{s.val}</div>
                <div className="text-gray-500 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="site-footer" className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/car-images/253tu3541.jpg" alt="footer bg" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-black/80" />
        </div>
        <div className="relative border-t border-white/10 py-12">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img
                  src="/logo.png"
                  alt="Palma Rent a Car"
                  className="w-8 h-8 rounded-lg object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className="text-white font-bold">PalmaRent</span>
              </div>
              <p className="text-slate-400 text-sm">{t.footerDesc}</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Phone size={14} className="text-green-400" /> {t.contact}
              </h4>
              <div className="space-y-2 text-slate-400 text-sm">
                <div className="flex items-center gap-2"><Phone size={12} /> {t.navPhone}</div>
                <div className="flex items-center gap-2"><Mail size={12} /> palmarentacar@gmail.com</div>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <MapPin size={14} className="text-green-400" /> {t.address}
              </h4>
              <p className="text-slate-400 text-sm flex items-center gap-2">
                <MapPin size={12} /> {t.addressVal}
              </p>
            </div>
          </div>
          <div className="text-center text-slate-500 text-xs mt-8">
            © {new Date().getFullYear()} Palma Rent a Car. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Notify Modal */}
      {notifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setNotifyModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" dir={isRtl ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="bg-red-50 border-b border-red-100 px-5 py-4 rounded-t-2xl flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell size={18} className="text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{notifyModal.car.brand} {notifyModal.car.model}</h3>
                <p className="text-xs text-red-500 mt-0.5">
                  {lang === "fr" ? "Indisponible pour vos dates" : lang === "ar" ? "غير متاحة في تواريخك" : "Unavailable for your dates"}
                </p>
                {notifyModal.availableFrom && (
                  <p className="text-xs text-green-600 font-semibold mt-1">
                    {lang === "fr" ? `Disponible à partir du ${notifyModal.availableFrom.split("-").reverse().join("/")}` 
                    : lang === "ar" ? `متاحة اعتباراً من ${notifyModal.availableFrom.split("-").reverse().join("/")}` 
                    : `Available from ${notifyModal.availableFrom.split("-").reverse().join("/")}`}
                  </p>
                )}
              </div>
              <button onClick={() => setNotifyModal(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>

            {notifySent ? (
              <div className="p-6 text-center">
                <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
                <p className="font-bold text-gray-900 mb-1">
                  {lang === "fr" ? "Demande enregistrée !" : lang === "ar" ? "تم تسجيل طلبك!" : "Request registered!"}
                </p>
                <p className="text-sm text-gray-500">
                  {lang === "fr" ? "Nous vous contacterons dès que la voiture sera disponible." 
                  : lang === "ar" ? "سنتصل بك فور توفر السيارة." 
                  : "We will contact you as soon as the car is available."}
                </p>
                <button onClick={() => setNotifyModal(null)}
                  className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                  {lang === "fr" ? "Fermer" : lang === "ar" ? "إغلاق" : "Close"}
                </button>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <p className="text-sm text-gray-600">
                  {lang === "fr" ? "Laissez vos coordonnées, nous vous contacterons dès que cette voiture sera disponible."
                  : lang === "ar" ? "اترك بياناتك وسنتصل بك فور توفر هذه السيارة."
                  : "Leave your details and we will contact you when this car becomes available."}
                </p>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    {lang === "fr" ? "Nom *" : lang === "ar" ? "الاسم *" : "Name *"}
                  </label>
                  <input value={notifyName} onChange={e => setNotifyName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    {lang === "fr" ? "Téléphone *" : lang === "ar" ? "الهاتف *" : "Phone *"}
                  </label>
                  <input value={notifyPhone} onChange={e => setNotifyPhone(e.target.value)} type="tel"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setNotifyModal(null)}
                    className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-2.5 rounded-xl text-sm transition-colors">
                    {lang === "fr" ? "Annuler" : lang === "ar" ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    disabled={!notifyName.trim() || !notifyPhone.trim()}
                    onClick={async () => {
                      await fetch(`${DB}/notifications.json`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          clientName: notifyName,
                          clientPhone: notifyPhone,
                          registration: notifyModal.car.registration,
                          brand: notifyModal.car.brand,
                          model: notifyModal.car.model,
                          availableFrom: notifyModal.availableFrom,
                          requestedDates: `${pickupDate} → ${returnDate}`,
                          lang,
                          _createdAt: Date.now(),
                        }),
                      }).catch(() => {});
                      setNotifySent(true);
                    }}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-1">
                    <Bell size={13} />
                    {lang === "fr" ? "Me notifier" : lang === "ar" ? "أشعرني" : "Notify me"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {modalCar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setModalCar(null); }}
        >
          <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto ${isRtl ? "text-right" : "text-left"}`}>
            <div className="relative bg-gray-100 rounded-t-3xl overflow-hidden h-48">
              <CarImage reg={modalCar.registration} photo={modalCar.photo} alt={`${modalCar.brand} ${modalCar.model}`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <h2 className="text-white font-black text-xl">{modalCar.brand} {modalCar.model}</h2>
              </div>
              <button
                onClick={() => setModalCar(null)}
                className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.perDay.replace("/ ", "")}</span>
                  <span className="font-semibold">{modalCar.dailyPrice} TND</span>
                </div>
                {searched && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{days} {days > 1 ? t.days : t.day}</span>
                      <span className="font-semibold">{days * modalCar.dailyPrice} TND</span>
                    </div>
                    <div className="flex justify-between border-t border-green-200 pt-1 mt-1">
                      <span className="font-bold text-gray-800">{t.total}</span>
                      <span className="font-extrabold text-green-600">{days * modalCar.dailyPrice} TND</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{t.deposit} ({depositPct}%)</span>
                      <span>{Math.ceil(days * modalCar.dailyPrice * depositPct / 100)} TND</span>
                    </div>
                  </>
                )}
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1">
                    <User size={12} /> {t.name}
                  </label>
                  <input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder={t.namePh}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${formErrors.name ? "border-red-400" : "border-gray-200"}`}
                  />
                  {formErrors.name && <p className="text-red-500 text-xs mt-0.5">{formErrors.name}</p>}
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1">
                    <Phone size={12} /> {t.phone}
                  </label>
                  <input
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder={t.phonePh}
                    type="tel"
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${formErrors.phone ? "border-red-400" : "border-gray-200"}`}
                  />
                  {formErrors.phone && <p className="text-red-500 text-xs mt-0.5">{formErrors.phone}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1">
                      <Mail size={12} /> {t.email}
                    </label>
                    <input
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder={t.emailPh}
                      type="email"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1">
                      <FileText size={12} /> {t.cin}
                    </label>
                    <input
                      value={formCin}
                      onChange={e => setFormCin(e.target.value)}
                      placeholder={t.cinPh}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1">
                    <MapPin size={12} /> {t.addr}
                  </label>
                  <input
                    value={formAddr}
                    onChange={e => setFormAddr(e.target.value)}
                    placeholder={t.addrPh}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1">
                    <MessageSquare size={12} /> {t.notes}
                  </label>
                  <textarea
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder={t.notesPh}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setModalCar(null)}
                    className="flex-1 border-2 border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-all text-sm shadow-md shadow-green-500/20 flex items-center justify-center gap-2"
                  >
                    {submitting
                      ? <><Loader2 size={14} className="animate-spin" /> {t.submitting}</>
                      : <><CheckCircle size={14} /> {t.confirm}</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle size={24} />
          <div>
            <div className="font-bold">{t.successTitle}</div>
            <div className="text-sm opacity-90">{t.successMsg}</div>
          </div>
        </div>
      )}
    </div>
  );
}
