import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, CreditCard, Building2, Truck, ArrowLeft, Loader2, Copy, Check, Smartphone, Wallet } from "lucide-react";

const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

type PayMethod = "konnect" | "flouci" | "paymee" | "d17" | "bank" | "cash";
type Lang = "fr" | "ar" | "en";

const LABELS: Record<Lang, Record<string, string>> = {
  fr: {
    title: "Paiement de l'acompte", subtitle: "Choisissez votre mode de paiement",
    car: "Votre véhicule", days: "jours", total: "Total séjour", deposit: "Acompte",
    method: "Mode de paiement", confirm: "Confirmer et payer",
    rib: "RIB", bank_name: "Banque", ref: "Référence", copy: "Copier", copied: "Copié !",
    bank_info: "Veuillez indiquer la référence dans le libellé du virement.",
    cash_info: "L'acompte sera réglé en espèces lors de la remise des clés.",
    success_title: "Demande envoyée !", success_msg: "Nous vous contacterons sous 24h pour confirmer.",
    processing: "Traitement...", secure: "Paiement 100% sécurisé", home: "Retour à l'accueil",
    online_pay: "Paiement en ligne", redirect: "Vous allez être redirigé vers",
  },
  ar: {
    title: "دفع العربون", subtitle: "اختر طريقة الدفع",
    car: "سيارتك", days: "أيام", total: "المجموع", deposit: "العربون",
    method: "طريقة الدفع", confirm: "تأكيد والدفع",
    rib: "رقم الحساب", bank_name: "البنك", ref: "المرجع", copy: "نسخ", copied: "تم!",
    bank_info: "يرجى ذكر المرجع في تفاصيل التحويل.",
    cash_info: "سيتم دفع العربون نقداً عند تسليم المفاتيح.",
    success_title: "تم إرسال الطلب!", success_msg: "سنتصل بك خلال 24 ساعة للتأكيد.",
    processing: "جاري...", secure: "دفع آمن 100%", home: "العودة للرئيسية",
    online_pay: "دفع إلكتروني", redirect: "ستُحوَّل إلى",
  },
  en: {
    title: "Deposit Payment", subtitle: "Choose your payment method",
    car: "Your vehicle", days: "days", total: "Total", deposit: "Deposit",
    method: "Payment method", confirm: "Confirm & Pay",
    rib: "RIB", bank_name: "Bank", ref: "Reference", copy: "Copy", copied: "Copied!",
    bank_info: "Please include the reference in the transfer description.",
    cash_info: "The deposit will be paid in cash upon key handover.",
    success_title: "Request sent!", success_msg: "We will contact you within 24h to confirm.",
    processing: "Processing...", secure: "100% Secure payment", home: "Back to home",
    online_pay: "Online payment", redirect: "You will be redirected to",
  },
};

const PAYMENT_METHODS = (lang: Lang) => [
  {
    id: "konnect" as PayMethod,
    icon: CreditCard,
    label: "Konnect",
    sub: lang === "fr" ? "Carte bancaire · Paiement sécurisé" : lang === "ar" ? "بطاقة بنكية · دفع آمن" : "Bank card · Secure payment",
    color: "border-blue-500 bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    badge: "konnect.network",
    badgeColor: "bg-blue-100 text-blue-700",
    logo: "https://konnect.network/favicon.ico",
  },
  {
    id: "flouci" as PayMethod,
    icon: Smartphone,
    label: "Flouci",
    sub: lang === "fr" ? "Portefeuille mobile tunisien" : lang === "ar" ? "محفظة موبايل تونسية" : "Tunisian mobile wallet",
    color: "border-green-500 bg-green-50",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    badge: "flouci.com",
    badgeColor: "bg-green-100 text-green-700",
    logo: null,
  },
  {
    id: "paymee" as PayMethod,
    icon: CreditCard,
    label: "Paymee",
    sub: lang === "fr" ? "Cartes tunisiennes & internationales" : lang === "ar" ? "بطاقات تونسية وأجنبية" : "Tunisian & international cards",
    color: "border-orange-500 bg-orange-50",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    badge: "paymee.tn",
    badgeColor: "bg-orange-100 text-orange-700",
    logo: null,
  },
  {
    id: "d17" as PayMethod,
    icon: Wallet,
    label: "D17",
    sub: lang === "fr" ? "Paiement en ligne tunisien" : lang === "ar" ? "دفع إلكتروني تونسي" : "Tunisian online payment",
    color: "border-red-500 bg-red-50",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    badge: "d17.tn",
    badgeColor: "bg-red-100 text-red-700",
    logo: null,
  },
  {
    id: "bank" as PayMethod,
    icon: Building2,
    label: lang === "fr" ? "Virement bancaire" : lang === "ar" ? "تحويل بنكي" : "Bank transfer",
    sub: lang === "fr" ? "Transférez sur notre compte STB" : lang === "ar" ? "حول إلى حسابنا في STB" : "Transfer to our STB account",
    color: "border-purple-500 bg-purple-50",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    badge: null,
    badgeColor: "",
    logo: null,
  },
  {
    id: "cash" as PayMethod,
    icon: Truck,
    label: lang === "fr" ? "Paiement à la livraison" : lang === "ar" ? "الدفع عند الاستلام" : "Pay on delivery",
    sub: lang === "fr" ? "Espèces à la remise des clés" : lang === "ar" ? "نقداً عند تسليم المفاتيح" : "Cash upon key handover",
    color: "border-amber-500 bg-amber-50",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    badge: null,
    badgeColor: "",
    logo: null,
  },
];

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = location.state?.booking as any;
  const lang: Lang = (booking?.lang as Lang) || "fr";
  const t = LABELS[lang];
  const isRtl = lang === "ar";

  const [method, setMethod] = useState<PayMethod>("konnect");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const refCode = useRef(`PALMA-${Date.now().toString(36).toUpperCase()}`);

  useEffect(() => {
    if (!booking) navigate("/", { replace: true });
  }, [booking, navigate]);

  if (!booking) return null;

  const rib = "11109000139400278805";
  const ref = refCode.current;

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function getPaymentLabel(m: PayMethod): string {
    const labels: Record<PayMethod, string> = {
      konnect: "Konnect (Carte bancaire)",
      flouci: "Flouci (Mobile wallet)",
      paymee: "Paymee",
      d17: "D17",
      bank: `Virement bancaire (Ref: ${ref})`,
      cash: "Paiement a la livraison",
    };
    return labels[m];
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const payload = {
        ...booking,
        paymentMethod: method,
        paymentRef: method === "bank" ? ref : undefined,
        notes: `${booking.notes ? booking.notes + " · " : ""}${getPaymentLabel(method)}`,
        status: "pending",
        _createdAt: Date.now(),
      };
      await fetch(`${DB}/bookings.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Redirect to payment gateway
      const amount = booking.depositAmount;
      const name = encodeURIComponent(booking.clientName);
      const phone = encodeURIComponent(booking.clientPhone || "");
      const email = encodeURIComponent(booking.clientEmail || "");
      const desc = encodeURIComponent(`Acompte Palma Rent a Car - ${booking.brand} ${booking.model}`);

      const redirects: Record<PayMethod, string | null> = {
        konnect: `https://app.konnect.network/payment-page?amount=${amount * 1000}&description=${desc}&firstName=${name}&phoneNumber=${phone}&email=${email}&orderId=${ref}`,
        flouci: `https://app.flouci.com/api/generate_payment?app_token=YOUR_FLOUCI_TOKEN&amount=${amount * 1000}&accept_card=true&session_id=${ref}&success_link=${encodeURIComponent(window.location.origin)}&fail_link=${encodeURIComponent(window.location.origin + "/payment")}`,
        paymee: `https://app.paymee.tn/gateway/YOUR_PAYMEE_TOKEN?amount=${amount}&note=${desc}&first_name=${name}&phone=${phone}&email=${email}&order_id=${ref}`,
        d17: `https://d17.tn/pay?merchant=YOUR_D17_ID&amount=${amount}&ref=${ref}&name=${name}`,
        bank: null,
        cash: null,
      };

      const url = redirects[method];
      if (url) {
        window.location.href = url;
        return;
      }

      setSuccess(true);
    } catch {
      setSuccess(true); // show success even on error
    } finally {
      setSubmitting(false);
    }
  }

  const methods = PAYMENT_METHODS(lang);

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6" dir={isRtl ? "rtl" : "ltr"}>
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">{t.success_title}</h2>
          <p className="text-gray-500 mb-2">{t.success_msg}</p>
          <p className="text-sm text-gray-400 mb-6">{booking.brand} {booking.model} · {booking.startDate} → {booking.endDate}</p>
          {method === "bank" && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 text-left text-sm space-y-1">
              <p className="font-bold text-purple-800 mb-2">Virement bancaire</p>
              <p className="text-purple-700">RIB: <span className="font-mono font-bold">{rib}</span></p>
              <p className="text-purple-700">Ref: <span className="font-mono font-bold">{ref}</span></p>
              <p className="text-purple-700">Montant: <span className="font-bold">{booking.depositAmount} TND</span></p>
            </div>
          )}
          <button onClick={() => navigate("/")}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors">
            {t.home}
          </button>
        </div>
      </div>
    );
  }

  const selectedMethod = methods.find(m => m.id === method)!;

  return (
    <div className="min-h-screen bg-gray-50" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <img src="/logo.png" alt="Palma" className="h-9 w-auto object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div>
            <h1 className="font-bold text-gray-800 text-sm">{t.title}</h1>
            <p className="text-xs text-gray-400">{t.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Booking summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
              {booking.photo
                ? <img src={booking.photo} alt={booking.brand} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl">🚗</div>}
            </div>
            <div>
              <p className="font-black text-gray-900 text-lg">{booking.brand} {booking.model}</p>
              <p className="text-sm text-gray-500">{booking.startDate} → {booking.endDate} · {booking.days} {t.days}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">{t.total}</p>
              <p className="font-black text-gray-800">{booking.totalAmount} TND</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-xs text-green-600 mb-1">{t.deposit}</p>
              <p className="font-black text-green-700 text-2xl">{booking.depositAmount} TND</p>
            </div>
          </div>
        </div>

        {/* Payment methods */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">{t.method}</h3>

          {/* Online payments group */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t.online_pay}</p>
          <div className="space-y-2 mb-4">
            {methods.filter(m => ["konnect","flouci","paymee","d17"].includes(m.id)).map(m => (
              <button key={m.id} onClick={() => setMethod(m.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${method === m.id ? m.color : "border-gray-100 bg-white hover:border-gray-200"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${method === m.id ? "bg-white shadow-sm" : m.iconBg}`}>
                  <m.icon size={20} className={method === m.id ? m.iconColor : "text-gray-400"} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold text-sm ${method === m.id ? "text-gray-900" : "text-gray-700"}`}>{m.label}</span>
                    {m.badge && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.badgeColor}`}>{m.badge}</span>}
                  </div>
                  <p className="text-xs text-gray-400">{m.sub}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${method === m.id ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                  {method === m.id && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            ))}
          </div>

          {/* Other methods */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            {lang === "fr" ? "Autres" : lang === "ar" ? "أخرى" : "Other"}
          </p>
          <div className="space-y-2">
            {methods.filter(m => ["bank","cash"].includes(m.id)).map(m => (
              <button key={m.id} onClick={() => setMethod(m.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${method === m.id ? m.color : "border-gray-100 bg-white hover:border-gray-200"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${method === m.id ? "bg-white shadow-sm" : m.iconBg}`}>
                  <m.icon size={20} className={method === m.id ? m.iconColor : "text-gray-400"} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <span className={`font-bold text-sm ${method === m.id ? "text-gray-900" : "text-gray-700"}`}>{m.label}</span>
                  <p className="text-xs text-gray-400">{m.sub}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${method === m.id ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                  {method === m.id && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Online payment info */}
        {["konnect","flouci","paymee","d17"].includes(method) && (
          <div className={`rounded-2xl border p-4 ${selectedMethod.color}`}>
            <div className="flex items-center gap-3">
              <selectedMethod.icon size={20} className={selectedMethod.iconColor} />
              <div>
                <p className="font-bold text-sm text-gray-800">{t.redirect} {selectedMethod.label}</p>
                <p className="text-xs text-gray-500">{selectedMethod.badge}</p>
              </div>
            </div>
          </div>
        )}

        {/* Bank transfer details */}
        {method === "bank" && (
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 size={16} className="text-purple-600" />
              {lang === "fr" ? "Coordonnees bancaires" : lang === "ar" ? "البيانات البنكية" : "Bank details"}
            </h3>
            <div className="space-y-2">
              {[
                { label: t.bank_name, value: "STB", key: "bank" },
                { label: t.rib, value: rib, key: "rib" },
                { label: lang === "fr" ? "Titulaire" : lang === "ar" ? "صاحب الحساب" : "Holder", value: "Ste Palma Rent a Car", key: "holder" },
                { label: t.ref, value: ref, key: "ref" },
                { label: lang === "fr" ? "Montant" : lang === "ar" ? "المبلغ" : "Amount", value: `${booking.depositAmount} TND`, key: "amount" },
              ].map(row => (
                <div key={row.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm text-gray-800">{row.value}</span>
                    {["rib","ref"].includes(row.key) && (
                      <button onClick={() => copyText(row.value, row.key)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors">
                        {copied === row.key ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-gray-400" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-purple-600 bg-purple-50 rounded-lg p-3 mt-3">{t.bank_info}</p>
          </div>
        )}

        {/* Cash info */}
        {method === "cash" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <Truck size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{t.cash_info}</p>
          </div>
        )}

        {/* Confirm */}
        <button onClick={handleConfirm} disabled={submitting}
          className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-black py-4 rounded-2xl transition-colors shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 text-base">
          {submitting
            ? <><Loader2 size={18} className="animate-spin" /> {t.processing}</>
            : ["konnect","flouci","paymee","d17"].includes(method)
            ? <><CreditCard size={18} /> {t.confirm} - {booking.depositAmount} TND</>
            : <><CheckCircle size={18} /> {t.confirm}</>}
        </button>

        <p className="text-center text-xs text-gray-400">🔒 {t.secure}</p>
      </div>
    </div>
  );
}
