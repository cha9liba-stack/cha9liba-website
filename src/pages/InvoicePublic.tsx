import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAllInvoices } from "../services/invoiceService";
import type { Invoice } from "../types/invoice";

// Lazy load InvoicePrint
function LazyInvoicePrint(props: any) {
  const [Comp, setComp] = useState<any>(null);
  useEffect(() => {
    import("../components/Invoices/InvoicePrint").then(m => setComp(() => m.default));
  }, []);
  if (!Comp) return null;
  return <Comp {...props} />;
}

export default function InvoicePublic() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    getAllInvoices().then(all => {
      const found = all.find(inv => inv.id === id || inv.number === id);
      if (found) setInvoice(found);
      else setNotFound(true);
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-400">Chargement...</p>
    </div>
  );

  if (notFound || !invoice) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-500">Facture introuvable</p>
    </div>
  );

  return (
    <LazyInvoicePrint
      invoice={invoice}
      onClose={() => window.close()}
    />
  );
}
