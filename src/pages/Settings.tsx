import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Users, Plus, Trash2, Eye, EyeOff, Shield, User } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { changePassword } from "../services/authService";
import { syncFromSheets } from "../services/sheetsService";
import { useContractStore } from "../store/useContractStore";

const DB_URL = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

async function fbGet(path: string) {
  const res = await fetch(`${DB_URL}/${path}.json`);
  return res.ok ? res.json() : null;
}
async function fbPut(path: string, data: any) {
  await fetch(`${DB_URL}/${path}.json`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
}
async function fbDelete(path: string) {
  await fetch(`${DB_URL}/${path}.json`, { method: "DELETE" });
}
async function fbPost(path: string, data: any): Promise<string> {
  const res = await fetch(`${DB_URL}/${path}.json`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const json = await res.json();
  return json.name;
}

interface AppUser {
  id: string;
  username: string;
  password: string;
  role: "admin" | "user" | "sous-traitant";
  permissions: string[];
  branchId?: string;
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const user = useAuthStore((s) => s.user);
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  const { contracts, setContracts } = useContractStore();

  // User management (admin only)
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "user" as "admin" | "user" | "sous-traitant" });
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [userMsg, setUserMsg] = useState("");
  const [branches, setBranches] = useState<{id: string; name: string}[]>([]);

  useEffect(() => {
    if (user?.role === "admin") {
      loadUsers();
      fetch(`${DB_URL}/branches.json`).then(r => r.json()).then(data => {
        if (data) setBranches(Object.entries(data).map(([id, v]: any) => ({ id, name: v.name })));
      }).catch(() => {});
    }
  }, [user]);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const data = await fbGet("users");
      if (data) {
        setUsers(Object.entries(data).map(([id, u]: any) => ({ id, ...u })));
      }
    } finally { setLoadingUsers(false); }
  }

  async function addUser() {
    if (!newUser.username.trim() || !newUser.password.trim()) return;
    try {
      await fbPost("users", { username: newUser.username, password: newUser.password, role: newUser.role, permissions: [], branchId: (newUser as any).branchId || null });
      setNewUser({ username: "", password: "", role: "user" });
      setShowAddUser(false);
      setUserMsg("✓ Utilisateur ajouté");
      loadUsers();
    } catch { setUserMsg("Erreur"); }
  }

  async function assignBranch(userId: string, branchId: string | null) {
    await fbPut(`users/${userId}/branchId`, branchId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, branchId: branchId || undefined } : u));
    setUserMsg("✓ Agence assignée");
  }

  async function deleteUser(id: string) {
    if (id === user?.firebaseId) return;
    await fbDelete(`users/${id}`);
    setUsers(prev => prev.filter(u => u.id !== id));
    setUserMsg("✓ Utilisateur supprimé");
  }

  async function resetUserPassword(id: string, newPassword: string) {
    await fbPut(`users/${id}/password`, newPassword);
    setUserMsg("✓ Mot de passe modifié");
  }

  async function handleSheetSync() {
    setSyncing(true);
    setMsg("");
    try {
      const merged = await syncFromSheets(contracts);
      setContracts(merged);
      setMsg(`✓ تمت المزامنة — ${merged.length} عقد`);
    } catch {
      setMsg(t("error_occurred"));
    } finally {
      setSyncing(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.firebaseId || !newPass) return;
    try {
      await changePassword(user.firebaseId, newPass);
      setMsg(t("saved_success"));
      setNewPass("");
    } catch {
      setMsg(t("error_occurred"));
    }
  }

  return (
    <div className="p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <h1 className="text-xl font-bold text-slate-800">{t("settings")}</h1>

      {/* Clear cache */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-700 mb-1">
          {isRTL ? "مسح البيانات المحلية" : "Vider le cache local"}
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          {isRTL
            ? "إذا كانت البيانات قديمة أو غير صحيحة، امسح الـ cache وأعد التحميل من Firebase"
            : "Si les données sont obsolètes, videz le cache et rechargez depuis Firebase"}
        </p>
        <button
          onClick={async () => {
            indexedDB.deleteDatabase("palma_renta_car");
            window.location.reload();
          }}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isRTL ? "مسح الـ cache وإعادة التحميل" : "Vider le cache et recharger"}
        </button>
      </div>

      {/* Google Sheets Sync */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-700 mb-1">
          {isRTL ? "مزامنة Google Sheets" : "Synchronisation Google Sheets"}
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          {isRTL
            ? "مزامنة كاملة في الاتجاهين مع جدول البيانات"
            : "Synchronisation bidirectionnelle avec la feuille de calcul"}
        </p>
        <button
          onClick={handleSheetSync}
          disabled={syncing}
          className="flex items-center gap-2 px-5 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
        >
          <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
          {syncing
            ? (isRTL ? "جاري المزامنة..." : "Synchronisation...")
            : (isRTL ? "مزامنة الآن" : "Synchroniser maintenant")}
        </button>
        {msg && <p className="text-sm text-green-600 mt-2">{msg}</p>}
      </div>

      {/* Language */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-700 mb-4">اللغة / Langue</h2>
        <div className="flex gap-3">
          {(["ar", "fr"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => i18n.changeLanguage(lang)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                i18n.language === lang
                  ? "bg-amber-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {lang === "ar" ? "العربية" : "Français"}
            </button>
          ))}
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-700 mb-4">
          {isRTL ? "تغيير كلمة المرور" : "Changer le mot de passe"}
        </h2>
        <form onSubmit={handleChangePassword} className="flex gap-3 max-w-sm">
          <input
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder={t("password")}
            className="flex-1 input"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {t("save")}
          </button>
        </form>
        {msg && <p className="text-sm text-green-600 mt-2">{msg}</p>}
      </div>

      {/* User management — admin only */}
      {user?.role === "admin" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <Users size={16} className="text-blue-500" />
              {isRTL ? "إدارة المستخدمين" : "Gestion des utilisateurs"}
            </h2>
            <button onClick={() => setShowAddUser(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg font-medium">
              <Plus size={13} /> {isRTL ? "إضافة" : "Ajouter"}
            </button>
          </div>

          {/* Add user form */}
          {showAddUser && (
            <div className="bg-blue-50 rounded-xl p-4 space-y-3 border border-blue-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">{isRTL ? "اسم المستخدم" : "Nom d'utilisateur"}</label>
                  <input value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">{isRTL ? "كلمة المرور" : "Mot de passe"}</label>
                  <input type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-xs font-medium text-slate-500">Role:</label>
                {(["user", "admin", "sous-traitant"] as const).map(r => (
                  <button key={r} onClick={() => setNewUser(p => ({ ...p, role: r }))}
                    className={`px-3 py-1 text-xs rounded-lg border font-medium transition-colors ${newUser.role === r ? "bg-blue-500 text-white border-blue-500" : "border-slate-200 text-slate-600"}`}>
                    {r === "admin" ? "Admin" : r === "sous-traitant" ? "Sous-traitant" : "Employé"}
                  </button>
                ))}
                <button onClick={addUser} disabled={!newUser.username || !newUser.password}
                  className="ms-auto px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg disabled:opacity-50">
                  {isRTL ? "حفظ" : "Enregistrer"}
                </button>
              </div>
            </div>
          )}

          {/* Users list */}
          {loadingUsers
            ? <p className="text-xs text-slate-400 text-center py-4">Chargement...</p>
            : <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <User size={14} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{u.username}</p>
                      <p className="text-xs text-slate-400 capitalize">{u.role}</p>
                    </div>
                  </div>
                  {/* Branch assignment */}
                  {u.role !== "admin" && (
                    <select
                      value={u.branchId || ""}
                      onChange={e => assignBranch(u.id, e.target.value || null)}
                      className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    >
                      <option value="">— Agence libre —</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  )}
                  <UserRow u={u} currentUserId={user.firebaseId}
                    showPass={showPasswords[u.id]}
                    onTogglePass={() => setShowPasswords(p => ({ ...p, [u.id]: !p[u.id] }))}
                    onDelete={() => deleteUser(u.id)}
                    onResetPass={(pwd) => resetUserPassword(u.id, pwd)}
                    isRTL={isRTL} />
                </div>
              ))}
            </div>
          }
          {userMsg && <p className="text-xs text-green-600 font-medium">{userMsg}</p>}
        </div>
      )}

      {/* User info */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-700 mb-3">
          {isRTL ? "معلومات الحساب" : "Informations du compte"}
        </h2>
        <p className="text-sm text-slate-600">
          {t("username")}: <span className="font-medium">{user?.username}</span>
        </p>
        <p className="text-sm text-slate-600 mt-1">
          Role: <span className="font-medium capitalize">{user?.role}</span>
        </p>
      </div>
    </div>
  );
}

function UserRow({ u, currentUserId, showPass, onTogglePass, onDelete, onResetPass, isRTL }: {
  u: AppUser; currentUserId?: string; showPass: boolean;
  onTogglePass: () => void; onDelete: () => void;
  onResetPass: (pwd: string) => void; isRTL: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const isCurrent = u.id === currentUserId;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${isCurrent ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${u.role === "admin" ? "bg-blue-100" : "bg-slate-200"}`}>
        {u.role === "admin" ? <Shield size={14} className="text-blue-600" /> : <User size={14} className="text-slate-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">{u.username}</p>
          {isCurrent && <span className="text-[10px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full">Vous</span>}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${u.role === "admin" ? "bg-blue-100 text-blue-700" : u.role === "sous-traitant" ? "bg-purple-100 text-purple-700" : "bg-slate-200 text-slate-600"}`}>
            {u.role === "admin" ? "Admin" : u.role === "sous-traitant" ? "Sous-traitant" : "Employé"}
          </span>
        </div>
        {editing
          ? <div className="flex items-center gap-2 mt-1">
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder="Nouveau mot de passe"
                className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
              <button onClick={() => { if (newPwd) { onResetPass(newPwd); setEditing(false); setNewPwd(""); } }}
                className="px-2 py-1 bg-blue-500 text-white text-xs rounded">OK</button>
              <button onClick={() => setEditing(false)} className="px-2 py-1 text-slate-500 text-xs">✕</button>
            </div>
          : <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              {showPass ? u.password : "••••••••"}
              <button onClick={onTogglePass} className="text-slate-300 hover:text-slate-500">
                {showPass ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
            </p>
        }
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => setEditing(p => !p)}
          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg text-xs transition-colors">
          {isRTL ? "تغيير" : "Modifier"}
        </button>
        {!isCurrent && (
          <button onClick={onDelete} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
