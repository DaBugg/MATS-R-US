import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import LocationsPage from "./pages/LocationsPage.jsx";
import AddMaterialPage from "./pages/AddMaterialPage.jsx";
import PlaceholderPage from "./pages/PlaceholderPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="add" element={<AddMaterialPage />} />
        <Route path="counts" element={<PlaceholderPage pageKey="counts" />} />
        <Route path="workers" element={<PlaceholderPage pageKey="workers" />} />
        <Route path="reports" element={<PlaceholderPage pageKey="reports" />} />
        <Route path="settings" element={<PlaceholderPage pageKey="settings" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
