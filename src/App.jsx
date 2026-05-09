import { useEffect, useMemo, useState } from "react";
import SvgBuildingMap from "./components/SvgBuildingMap.jsx";
import InventoryPanel from "./components/InventoryPanel.jsx";
import { useLocations } from "./hooks/useLocations.js";
import { useInventoryStats } from "./hooks/useInventoryStats.js";
import { isSupabaseConfigured } from "./lib/supabaseClient.js";

export default function App() {
  const {
    activeLocations,
    loading: locationsLoading,
    error: locationsError,
  } = useLocations();

  const { statsByLocation } = useInventoryStats();

  const [selectedLocationId, setSelectedLocationId] = useState(null);

  // Default to the first active location once they load. If the currently
  // selected location is archived/deleted, fall back to the first active one.
  useEffect(() => {
    if (activeLocations.length === 0) return;
    const stillExists = activeLocations.some((l) => l.id === selectedLocationId);
    if (!selectedLocationId || !stillExists) {
      setSelectedLocationId(activeLocations[0].id);
    }
  }, [activeLocations, selectedLocationId]);

  const selectedLocation = useMemo(
    () => activeLocations.find((l) => l.id === selectedLocationId) ?? null,
    [activeLocations, selectedLocationId],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {!isSupabaseConfigured && <SupabaseNotConfiguredBanner />}
      {locationsError && <ErrorBanner error={locationsError} />}

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(440px,520px)_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f7f5f1] shadow-sm">
            <div className="p-2">
              <SvgBuildingMap
                locations={activeLocations}
                statsByLocation={statsByLocation}
                loading={locationsLoading}
                selectedLocationId={selectedLocationId}
                onSelectLocation={setSelectedLocationId}
              />
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <InventoryPanel selectedLocation={selectedLocation} />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            SNL
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              SNL Inventory
            </h1>
            <p className="text-xs text-slate-500">
              What material do we have, and where is it?
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 text-xs text-slate-500">
        <span>MATS-R-US — MVP</span>
        <span>Powered by Supabase Realtime</span>
      </div>
    </footer>
  );
}

function SupabaseNotConfiguredBanner() {
  return (
    <div className="bg-amber-50 text-amber-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-3 text-sm">
        <strong>Supabase is not configured.</strong> Copy{" "}
        <code className="rounded bg-amber-100 px-1.5 py-0.5">.env.example</code>{" "}
        to{" "}
        <code className="rounded bg-amber-100 px-1.5 py-0.5">.env.local</code>,
        paste your Supabase URL and anon key, then restart{" "}
        <code className="rounded bg-amber-100 px-1.5 py-0.5">npm run dev</code>.
      </div>
    </div>
  );
}

function ErrorBanner({ error }) {
  return (
    <div className="bg-rose-50 text-rose-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-3 text-sm">
        <strong>Failed to load locations.</strong>{" "}
        {error?.message ?? "Unknown error."}
      </div>
    </div>
  );
}
