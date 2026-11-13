import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import LocationsPage from "./pages/LocationsPage.jsx";
import AddMaterialPage from "./pages/AddMaterialPage.jsx";
import PlaceholderPage from "./pages/PlaceholderPage.jsx";
import PlanAccess from "./components/plans/PlanAccess.jsx";

const DrawingsPage = lazy(() => import("./pages/DrawingsPage.jsx"));
const TakeoffPage = lazy(() => import("./pages/TakeoffPage.jsx"));
const RequirementsPage = lazy(() => import("./pages/RequirementsPage.jsx"));

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/locations" replace />} />
        <Route path="dashboard" element={<Navigate to="/locations" replace />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="add" element={<AddMaterialPage />} />
        <Route path="drawings" element={<PlanAccess><Suspense fallback={<p>Loading drawings…</p>}><DrawingsPage /></Suspense></PlanAccess>} />
        <Route path="takeoffs/:id" element={<PlanAccess><Suspense fallback={<p>Loading takeoff…</p>}><TakeoffPage /></Suspense></PlanAccess>} />
        <Route path="requirements" element={<PlanAccess><Suspense fallback={<p>Loading order sheets…</p>}><RequirementsPage /></Suspense></PlanAccess>} />
        <Route path="orders" element={<PlanAccess><Suspense fallback={<p>Loading order sheets…</p>}><RequirementsPage /></Suspense></PlanAccess>} />
        <Route path="movements" element={<PlaceholderPage pageKey="movements" />} />
        <Route path="settings" element={<PlaceholderPage pageKey="settings" />} />
        <Route path="*" element={<Navigate to="/locations" replace />} />
      </Route>
    </Routes>
  );
}
