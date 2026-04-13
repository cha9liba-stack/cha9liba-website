import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Settings,
  LogOut,
  Globe,
  Car,
  Users,
  ChevronDown,
  ChevronRight,
  Gauge,
  MapPin,
  BarChart2,
  Navigation,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { useState } from "react";
import { isSousTraitant } from "../../lib/permissions";
import { useEffect } from "react";

export default function Sidebar() {
  const { t, i18n } = useTranslation();
  const { user, logout, selectedBranch, setSelectedBranch } = useAuthStore();
  const isOnline = useOnlineStatus();
  const isRTL = i18n.language === "ar";
  const [gestionOpen, setGestionOpen] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const isST = isSousTraitant(user);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) setIsOpen(false);
  }, [isMobile]);

  const mainItems = [
    { to: "/app",             icon: LayoutDashboard, label: isRTL ? "لوحة القيادة" : "Tableau de bord", hidden: isST },
    { to: "/app/contracts",    icon: FileText,         label: isRTL ? "العقود" : "Contrats", hidden: false },
    { to: "/app/invoices",     icon: Receipt,          label: isRTL ? "الفواتير" : "Factures", hidden: isST },
    { to: "/app/statistics",   icon: BarChart2,        label: isRTL ? "الإحصائيات" : "Statistiques", hidden: isST || user?.role !== "admin" },
    { to: "/app/settings",     icon: Settings,         label: isRTL ? "الإعدادات" : "Paramètres", hidden: isST },
  ].filter(i => !i.hidden);

  const gestionItems = [
    { to: "/app/fleet",          icon: Gauge,      label: isRTL ? "الأسطول اليومي" : "Flotte",           hidden: false },
    { to: "/app/vehicles",       icon: Car,        label: isRTL ? "السيارات"       : "Véhicules",         hidden: isST },
    { to: "/app/clients",        icon: Users,      label: isRTL ? "العملاء"        : "Clients",           hidden: isST },
    { to: "/app/online-bookings", icon: Car,       label: isRTL ? "حجوزات الإنترنت" : "Réservations web",  hidden: isST },
    { to: "/app/notifications",  icon: Bell,       label: isRTL ? "إشعارات التوفر"  : "Notifications",     hidden: isST },
    { to: "/app/sous-traitants", icon: Gauge,      label: isRTL ? "المقاولون"      : "Sous-traitants",    hidden: isST },
    { to: "/app/gps",            icon: Navigation, label: "GPS",                                           hidden: isST },
  ].filter(i => !i.hidden);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
      isActive
        ? "bg-amber-500 text-white font-medium"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-amber-500 text-white rounded-lg shadow-lg"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col w-64 min-h-screen bg-slate-900 text-white ${isRTL ? "border-l" : "border-r"} border-slate-700 transition-transform duration-300 ${isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}`}
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <img
            src="/logo.png"
            alt="logo"
            className="w-9 h-9 rounded-xl object-contain bg-white p-0.5"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div>
            <p className="font-bold text-sm leading-tight">{t("app_title")}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400" : "bg-red-400"}`} />
              <span className="text-xs text-slate-400">
                {isOnline ? t("online") : t("offline")}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Main items */}
          {mainItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/app"}
              className={navLinkClass}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

          {/* Gestion section */}
          <div className="pt-3">
            <button
              onClick={() => setGestionOpen(o => !o)}
              className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
            >
              <span>{isRTL ? "الإدارة" : "Gestion"}</span>
              {gestionOpen
                ? <ChevronDown size={13} />
                : <ChevronRight size={13} />
              }
            </button>

            {gestionOpen && (
              <div className="mt-1 space-y-1">
                {gestionItems.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={navLinkClass}
                    onClick={() => isMobile && setIsOpen(false)}
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-slate-700 space-y-2">
          <button
            onClick={() => i18n.changeLanguage(i18n.language === "ar" ? "fr" : "ar")}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Globe size={18} />
            {i18n.language === "ar" ? "Français" : "العربية"}
          </button>

          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-sm font-medium">{user?.username}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
              {selectedBranch && (
                <button
                  onClick={() => setSelectedBranch(null)}
                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 mt-0.5 transition-colors"
                  title="Changer d'agence"
                >
                  <MapPin size={10} />
                  {selectedBranch.name}
                </button>
              )}
            </div>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-red-400 transition-colors"
              title={t("logout")}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
