import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/layout/AppShell.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import LocationsPage from "./pages/LocationsPage.jsx";
import AddMaterialPage from "./pages/AddMaterialPage.jsx";
import PlaceholderPage from "./pages/PlaceholderPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/locations" replace />} />
        <Route path="dashboard" element={<Navigate to="/locations" replace />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="add" element={<AddMaterialPage />} />
        <Route path="movements" element={<PlaceholderPage pageKey="movements" />} />
        <Route path="settings" element={<PlaceholderPage pageKey="settings" />} />
        <Route path="*" element={<Navigate to="/locations" replace />} />
      </Route>
    </Routes>
  );
}
