import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
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
        navigate("/");
      } else {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      }
    } catch {
      setError(t("error_occurred"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-white rounded-2xl p-3 mb-4 shadow-lg">
            <img
              src="/logo.png"
              alt="logo"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = "none";
                el.parentElement!.innerHTML = `<div class="bg-amber-500 rounded-2xl p-4"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="1"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/></svg></div>`;
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-white">{t("app_title")}</h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t("username")}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t("password")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? t("loading") : t("login")}
            </button>
          </form>
        </div>

        {/* Language toggle */}
        <button
          onClick={() => i18n.changeLanguage(i18n.language === "ar" ? "fr" : "ar")}
          className="flex items-center gap-2 mx-auto mt-4 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <Globe size={14} />
          {i18n.language === "ar" ? "Français" : "العربية"}
        </button>
      </div>
    </div>
  );
}
