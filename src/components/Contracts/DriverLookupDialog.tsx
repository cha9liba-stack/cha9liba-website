import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X, UserCheck } from "lucide-react";
import { getAllContracts } from "../../services/contractService";
import type { Contract } from "../../types";

interface Props {
  onSelect: (data: Partial<Contract>) => void;
  onClose: () => void;
  forDriver2?: boolean;
}

export default function DriverLookupDialog({ onSelect, onClose, forDriver2 = false }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const all = await getAllContracts();
      const q = query.trim().toLowerCase();
      const found = all.filter((c) => {
        const name1 = (c.driverName || "").toLowerCase();
        const cin1  = (c.driverCin  || "").toLowerCase();
        const name2 = (c.driver2Name || "").toLowerCase();
        const cin2  = (c.driver2Cin  || "").toLowerCase();
        return name1.includes(q) || cin1.includes(q) || name2.includes(q) || cin2.includes(q);
      });
      // Deduplicate by CIN — keep most recent
      const seen = new Set<string>();
      const deduped = found
        .sort((a, b) => (b._createdAt ?? 0) - (a._createdAt ?? 0))
        .filter((c) => {
          const key = forDriver2 ? c.driver2Cin : c.driverCin;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      setResults(deduped.slice(0, 20));
    } finally {
      setLoading(false);
    }
  }

  function pickContract(c: Contract, useDriver2 = false) {
    let data: Partial<Contract>;
    if (forDriver2) {
      // Fill driver2 fields
      const src = useDriver2 ? {
        name: c.driver2Name, dob: c.driver2Dob, birth: c.driver2BirthPlace,
        addr: c.driver2Address, phone: c.driver2Phone, cin: c.driver2Cin,
        cinDate: c.driver2CinDate, cinPlace: c.driver2CinPlace,
        lic: c.driver2License, licDate: c.driver2LicenseDate, licPlace: c.driver2LicensePlace,
      } : {
        name: c.driverName, dob: c.driverDob, birth: c.driverBirthPlace,
        addr: c.driverAddress, phone: c.driverPhone, cin: c.driverCin,
        cinDate: c.driverCinDate, cinPlace: c.driverCinPlace,
        lic: c.driverLicense, licDate: c.driverLicenseDate, licPlace: c.driverLicensePlace,
      };
      data = {
        driver2Name: src.name, driver2Dob: src.dob, driver2BirthPlace: src.birth,
        driver2Address: src.addr, driver2Phone: src.phone, driver2Cin: src.cin,
        driver2CinDate: src.cinDate, driver2CinPlace: src.cinPlace,
        driver2License: src.lic, driver2LicenseDate: src.licDate, driver2LicensePlace: src.licPlace,
      };
    } else {
      data = {
        driverName: c.driverName, driverDob: c.driverDob, driverBirthPlace: c.driverBirthPlace,
        driverAddress: c.driverAddress, driverPhone: c.driverPhone, driverCin: c.driverCin,
        driverCinDate: c.driverCinDate, driverCinPlace: c.driverCinPlace,
        driverLicense: c.driverLicense, driverLicenseDate: c.driverLicenseDate,
        driverLicensePlace: c.driverLicensePlace,
      };
    }
    onSelect(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-amber-500" />
            <h3 className="font-semibold text-slate-800">
              {isRTL ? "استرداد من عقد سابق" : "Récupérer d'un contrat précédent"}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? "right-3" : "left-3"}`} />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={isRTL ? "ابحث بالاسم أو رقم البطاقة..." : "Rechercher par nom ou CIN..."}
                className={`w-full input ${isRTL ? "pr-9" : "pl-9"}`}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? "..." : t("search_placeholder").split(" ")[0]}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {!searched ? (
            <p className="text-center text-slate-400 text-sm py-10">
              {isRTL ? "اكتب اسم السائق أو رقم بطاقته للبحث" : "Entrez le nom ou le CIN du conducteur"}
            </p>
          ) : results.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-10">{t("no_results")}</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {results.map((c) => (
                <li
                  key={c.id}
                  className="px-5 py-3 hover:bg-amber-50 cursor-pointer transition-colors"
                  onClick={() => pickContract(c)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{c.driverName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t("cin")}: {c.driverCin} &nbsp;·&nbsp;
                        {t("phone")}: {c.driverPhone}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-xs text-amber-600 font-medium">#{c.contractNumber}</p>
                      <p className="text-xs text-slate-400">{c.departureDate}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
