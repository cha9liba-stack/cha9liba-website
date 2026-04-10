import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe, Lock, Loader2, User, LogIn } from "lucide-react";
import { login } from "../services/authService";
import { useAuthStore } from "../store/useAuthStore";

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isRTL = i18n.language === "ar";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(username, password);
      if (user) {
        setUser(user);
        navigate("/app");
      } else {
        setError("Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø£Ùˆ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± ØµØ­ÙŠØ­Ø©");
      }
    } catch {
      setError(t("error_occurred"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" dir={isRTL ? "rtl" : "ltr"}>

      {/* â”€â”€ Left: Form â”€â”€ */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-white rounded-2xl shadow-lg p-4 mb-5 border border-gray-100">
              <img src="/logo.png" alt="logo" className="w-36 h-36 object-contain"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
            <h1 className="text-3xl font-black text-green-600 mb-2">Bienvenue !</h1>
            <p className="text-slate-500 text-sm">Connectez-vous Ã  votre espace Palma</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">{t("username")}</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                    placeholder="vous@exemple.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-all"
                    required autoFocus />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">{t("password")}</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-all"
                    required />
                </div>
              </div>

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
                {loading ? <><Loader2 size={15} className="animate-spin" /> {t("loading")}</> : <><LogIn size={15} /> Se connecter</>}
              </button>
            </form>
          </div>

          {/* Language toggle */}
          <button onClick={() => i18n.changeLanguage(i18n.language === "ar" ? "fr" : "ar")}
            className="flex items-center gap-2 mx-auto mt-5 text-slate-400 hover:text-slate-600 text-sm transition-colors">
            <Globe size={14} />
            {i18n.language === "ar" ? "FranÃ§ais" : "Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©"}
          </button>
        </div>
      </div>

      {/* â”€â”€ Right: Car image with green overlay â”€â”€ */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img src="/car-images/254tu7378.png" alt="Palma Car"
          className="w-full h-full object-cover object-center" />
        {/* Green overlay */}
        <div className="absolute inset-0 bg-green-600/60" />
        {/* Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-10">
          <h2 className="text-4xl font-black leading-tight mb-4">Palma<br />Car Rentals</h2>
          <p className="text-white/90 text-base max-w-xs">DÃ©couvrez notre flotte et profitez d'une expÃ©rience de location exceptionnelle</p>
        </div>
      </div>

    </div>
  );
}

