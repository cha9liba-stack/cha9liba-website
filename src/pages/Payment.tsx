import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, CreditCard, Building2, Truck, ArrowLeft, Loader2, Copy, Check } from "lucide-react";

const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

type PayMethod = "card" | "bank" | "cash";
type Lang = "fr" | "ar" | "en";

const T: Record<Lang, Record<string, string>> = {
  fr: {
    title: "Paiement de l'acompte",
    subtitle: "Choisissez votre mode de paiement",
    car: "Votre véhicule",
    period: "Période",
    days: "jours",
    total: "Total séjour",
    deposit: "Acompte à payer",
    method: "Mode de paiement",
    card: "Carte bancaire en ligne",
    cardSub: "Paiement sécurisé via Konnect",
    bank: "Virement bancaire",
    bankSub: "Transférez l'acompte sur notre compte",
    cash: "Paiement à la livraison",
    cashSub: "Payez en espèces à la réception du véhicule",
    confirm: "Confirmer et payer",
    back: "Retour",
    rib: "RIB",
    bank_name: "Banque",
    account: "Compte",
    ref: "Référence à indiquer",
    copy: "Copier",
    copied: "Copié !",
    cash_info: "L'acompte sera réglé en espèces lors de la remise des clés.",
    success_title: "Demande envoyée !",
    success_msg: "Nous vous contacterons sous 24h pour confirmer votre réservation.",
    processing: "Traitement en cours...",
    secure: "Paiement 100% sécurisé",
  },
  ar: {
    title: "دفع العربون",
    subtitle: "اختر طريقة الدفع",
    car: "سيارتك",
    period: "الفترة",
    days: "أيام",
    total: "المجموع",
    deposit: "العربون المطلوب",
    method: "طريقة الدفع",
    card: "بطاقة بنكية إلكترونية",
    cardSub: "دفع آمن عبر Konnect",
    bank: "تحويل بنكي",
    bankSub: "حول العربون إلى حسابنا البنكي",
    cash: "الدفع عند الاستلام",
    cashSub: "ادفع نقداً عند استلام السيارة",
    confirm: "تأكيد والدفع",
    back: "رجوع",
    rib: "رقم الحساب",
    bank_name: "البنك",
    account: "الحساب",
    ref: "المرجع المطلوب",
    copy: "نسخ",
    copied: "تم النسخ!",
    cash_info: "سيتم دفع العربون نقداً عند تسليم المفاتيح.",
    success_title: "تم إرسال الطلب!",
    success_msg: "سنتصل بك خلال 24 ساعة لتأكيد حجزك.",
    processing: "جاري المعالجة...",
    secure: "دفع آمن 100%",
  },
  en: {
    title: "Deposit Payment",
    subtitle: "Choose your payment method",
    car: "Your vehicle",
    period: "Period",
    days: "days",
    total: "Total stay",
    deposit: "Deposit to pay",
    method: "Payment method",
    card: "Online bank card",
    cardSub: "Secure payment via Konnect",
    bank: "Bank transfer",
    bankSub: "Transfer the deposit to our account",
    cash: "Pay on delivery",
    cashSub: "Pay cash when receiving the vehicle",
    confirm: "Confirm & Pay",
    back: "Back",
    rib: "RIB",
    bank_name: "Bank",
    account: "Account",
    ref: "Reference to include",
    copy: "Copy",
    copied: "Copied!",
    cash_info: "The deposit will be paid in cash upon key handover.",
    success_title: "Request sent!",
    success_msg: "We will contact you within 24h to confirm your booking.",
    processing: "Processing...",
    secure: "100% Secure payment",
  },
};

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const booking = location.state?.booking as any;
  const lang: Lang = (booking?.lang as Lang) || "fr";
  const t = T[lang];
  const isRtl = lang === "ar";

  const [method, setMethod] = useState<PayMethod>("card");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Redirect if no booking data
  useEffect(() => {
    if (!booking) navigate("/", { replace: true });
  }, [booking, navigate]);

  if (!booking) return null;

  const ref = `PALMA-${Date.now().toString(36).toUpperCase()}`;
  const rib = "11109000139400278805";
  const bankName = "STB";

  function copyRib() {
    navigator.clipboard.writeText(rib).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      // Save booking to Firebase with payment method
      const payload = {
        ...booking,
        paymentMethod: method,
        paymentRef: method === "bank" ? ref : undefined,
        status: "pending",
        _createdAt: Date.now(),
      };
      await fetch(`${DB}/bookings.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // If card payment → redirect to Konnect
      if (method === "card") {
        // Konnect payment link (replace with real API key)
        const konnectUrl = `https://app.konnect.network/payment-page?amount=${booking.depositAmount * 1000}&description=Acompte+Palma+Rent+a+Car&firstName=${encodeURIComponent(booking.clientName)}&phoneNumber=${encodeURIComponent(booking.clientPhone)}&email=${encodeURIComponent(booking.clientEmail || "")}&orderId=${ref}`;
        window.location.href = konnectUrl;
        return;
      }

      setSuccess(true);
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center p-6 ${isRtl ? "rtl" : "ltr"}`} dir={isRtl ? "rtl" : "ltr"}>
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">{t.success_title}</h2>
          <p className="text-gray-500 mb-2">{t.success_msg}</p>
          <p className="text-sm text-gray-400 mb-8">
            {booking.brand} {booking.model} · {booking.startDate} → {booking.endDate}
          </p>
          {method === "bank" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left text-sm">
              <p className="font-bold text-blue-800 mb-2">Virement bancaire</p>
              <p className="text-blue-700">RIB: <span className="font-mono font-bold">{rib}</span></p>
              <p className="text-blue-700">Ref: <span className="font-mono font-bold">{ref}</span></p>
              <p className="text-blue-700">Montant: <span className="font-bold">{booking.depositAmount} TND</span></p>
            </div>
          )}
          <button onClick={() => navigate("/")}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors">
            {lang === "fr" ? "Retour à l'accueil" : lang === "ar" ? "العودة للرئيسية" : "Back to home"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <img src="/logo.png" alt="Palma" className="h-9 w-auto object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <h1 className="font-bold text-gray-800">{t.title}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Booking summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide text-gray-400">{t.car}</h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
              {booking.photo
                ? <img src={booking.photo} alt={booking.brand} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-2xl">🚗</div>}
            </div>
            <div className="flex-1">
              <p className="font-black text-gray-900 text-lg">{booking.brand} {booking.model}</p>
              <p className="text-sm text-gray-500">{booking.startDate} → {booking.endDate} · {booking.days} {t.days}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">{t.total}</p>
              <p className="font-black text-gray-800">{booking.totalAmount} TND</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-xs text-green-600 mb-1">{t.deposit}</p>
              <p className="font-black text-green-700 text-xl">{booking.depositAmount} TND</p>
            </div>
          </div>
        </div>

        {/* Payment method selection */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">{t.method}</h3>
          <div className="space-y-3">
            {([
              { id: "card" as PayMethod, icon: CreditCard, label: t.card, sub: t.cardSub, color: "border-blue-500 bg-blue-50", iconColor: "text-blue-600", badge: "Konnect" },
              { id: "bank" as PayMethod, icon: Building2, label: t.bank, sub: t.bankSub, color: "border-purple-500 bg-purple-50", iconColor: "text-purple-600", badge: null },
              { id: "cash" as PayMethod, icon: Truck, label: t.cash, sub: t.cashSub, color: "border-amber-500 bg-amber-50", iconColor: "text-amber-600", badge: null },
            ]).map(m => (
              <button key={m.id} onClick={() => setMethod(m.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${method === m.id ? m.color : "border-gray-100 bg-white hover:border-gray-200"}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${method === m.id ? "bg-white shadow-sm" : "bg-gray-100"}`}>
                  <m.icon size={22} className={method === m.id ? m.iconColor : "text-gray-400"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-sm ${method === m.id ? "text-gray-900" : "text-gray-700"}`}>{m.label}</p>
                    {m.badge && <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">{m.badge}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${method === m.id ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                  {method === m.id && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bank transfer details */}
        {method === "bank" && (
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 size={16} className="text-purple-600" />
              {lang === "fr" ? "Coordonnées bancaires" : lang === "ar" ? "البيانات البنكية" : "Bank details"}
            </h3>
            <div className="space-y-3">
              {[
                { label: t.bank_name, value: bankName },
                { label: t.rib, value: rib, copyable: true },
                { label: lang === "fr" ? "Titulaire" : lang === "ar" ? "صاحب الحساب" : "Account holder", value: "Ste Palma Rent a Car" },
                { label: t.ref, value: ref, copyable: true },
                { label: lang === "fr" ? "Montant exact" : lang === "ar" ? "المبلغ الدقيق" : "Exact amount", value: `${booking.depositAmount} TND` },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm text-gray-800">{row.value}</span>
                    {row.copyable && (
                      <button onClick={copyRib}
                        className="p-1 hover:bg-gray-100 rounded transition-colors">
                        {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-gray-400" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-purple-600 bg-purple-50 rounded-lg p-3 mt-3">
              {lang === "fr" ? "Veuillez indiquer la référence dans le libellé du virement."
              : lang === "ar" ? "يرجى ذكر المرجع في تفاصيل التحويل."
              : "Please include the reference in the transfer description."}
            </p>
          </div>
        )}

        {/* Cash info */}
        {method === "cash" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Truck size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{t.cash_info}</p>
            </div>
          </div>
        )}

        {/* Confirm button */}
        <button onClick={handleConfirm} disabled={submitting}
          className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-black py-4 rounded-2xl transition-colors shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 text-base">
          {submitting
            ? <><Loader2 size={18} className="animate-spin" /> {t.processing}</>
            : method === "card"
            ? <><CreditCard size={18} /> {t.confirm} — {booking.depositAmount} TND</>
            : <><CheckCircle size={18} /> {t.confirm}</>}
        </button>

        <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
          🔒 {t.secure}
        </p>
      </div>
    </div>
  );
}
