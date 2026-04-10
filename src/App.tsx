import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import AppLayout from "./components/Layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Contracts from "./pages/Contracts";
import Settings from "./pages/Settings";
import Fleet from "./pages/Fleet";
import Vehicles from "./pages/Vehicles";
import VehicleDetail from "./pages/VehicleDetail";
import Clients from "./pages/Clients";
import Booking from "./pages/Booking";
import InvoicePublic from "./pages/InvoicePublic";
import { lazy, Suspense } from "react";
import SMSTest from "./pages/SMSTest";
import Statistics from "./pages/Statistics";
import OnlineBookings from "./pages/OnlineBookings";
import SousTraitants from "./pages/SousTraitants";
import GPS from "./pages/GPS";
import { isSousTraitant } from "./lib/permissions";

const Invoices = lazy(() => import("./pages/Invoices"));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// Root redirect: staff → /, visitor → /booking
function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  return user ? <Navigate to="/" replace /> : <Navigate to="/booking" replace />;
}

function STProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (isSousTraitant(user)) return <Navigate to="/app/contracts" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root = Booking page (public) */}
        <Route path="/" element={<Booking />} />
        <Route path="/login" element={<Login />} />
        <Route path="/invoice" element={<InvoicePublic />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<STProtectedRoute><Dashboard /></STProtectedRoute>} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="fleet" element={<Fleet />} />
          <Route path="vehicles" element={<STProtectedRoute><Vehicles /></STProtectedRoute>} />
          <Route path="vehicles/:registration" element={<STProtectedRoute><VehicleDetail /></STProtectedRoute>} />
          <Route path="clients" element={<STProtectedRoute><Clients /></STProtectedRoute>} />
          <Route path="invoices" element={
            <STProtectedRoute>
              <Suspense fallback={<div className="p-6 text-slate-400">Chargement...</div>}>
                <Invoices />
              </Suspense>
            </STProtectedRoute>
          } />
          <Route path="settings" element={<STProtectedRoute><Settings /></STProtectedRoute>} />
          <Route path="statistics" element={<STProtectedRoute><Statistics /></STProtectedRoute>} />
          <Route path="online-bookings" element={<STProtectedRoute><OnlineBookings /></STProtectedRoute>} />
          <Route path="sous-traitants" element={<STProtectedRoute><SousTraitants /></STProtectedRoute>} />
          <Route path="gps" element={<STProtectedRoute><GPS /></STProtectedRoute>} />
          <Route path="sms-test" element={<SMSTest />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
