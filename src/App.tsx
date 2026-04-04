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
import { lazy, Suspense } from "react";

const Invoices = lazy(() => import("./pages/Invoices"));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="fleet" element={<Fleet />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="vehicles/:registration" element={<VehicleDetail />} />
          <Route path="clients" element={<Clients />} />
          <Route path="invoices" element={
            <Suspense fallback={<div className="p-6 text-slate-400">Chargement...</div>}>
              <Invoices />
            </Suspense>
          } />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
