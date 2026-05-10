import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import SvgBuildingMap from "../components/SvgBuildingMap.jsx";
import InventoryPanel from "../components/InventoryPanel.jsx";
import LocationCard from "../components/LocationCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useLocations } from "../hooks/useLocations.js";
import { useInventoryStats } from "../hooks/useInventoryStats.js";
import { useAllInventory } from "../hooks/useAllInventory.js";
import { getStatus, STATUS } from "../lib/inventoryStatus.js";

export default function LocationsPage() {
  const {
    activeLocations,
    loading: locLoading,
  } = useLocations();
  const { statsByLocation } = useInventoryStats();
  const { items: allItems } = useAllInventory();

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLocationId = searchParams.get("location") ?? null;

  // Default to first active floor when no selection. Use a side effect via
  // setSearchParams in a handler — but we want to also allow no selection
  // initially without forcing one. We'll let the inventory panel handle the
  // "no selection" state.
  const selectedLocation = useMemo(
    () => activeLocations.find((l) => l.id === selectedLocationId) ?? null,
    [activeLocations, selectedLocationId],
  );

  const setSelectedLocation = (id) => {
    if (id) {
      setSearchParams({ location: id });
    } else {
      setSearchParams({});
    }
  };

  // Per-location count of items needing review.
  const criticalByLocation = useMemo(() => {
    const map = new Map();
    for (const row of allItems) {
      const s = getStatus(row);
      if (s === STATUS.OK || s === STATUS.UNKNOWN) continue;
      const id = row.location?.id;
      if (!id) continue;
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [allItems]);

  const groupedLocations = useMemo(() => {
    const sorted = [...activeLocations].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    return {
      floors: sorted.filter((l) => l.type === "floor"),
      storage: sorted.filter((l) => l.type === "storage"),
      other: sorted.filter((l) => l.type === "other"),
    };
  }, [activeLocations]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Locations
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Building elevation, floors, storage areas, and project basecamps.
          </p>
        </div>
      </div>

      {/* Two columns: building map + selected inventory */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(420px,520px)_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f7f5f1] shadow-sm">
          <div className="p-2">
            <SvgBuildingMap
              locations={activeLocations}
              statsByLocation={statsByLocation}
              loading={locLoading}
              selectedLocationId={selectedLocationId}
              onSelectLocation={setSelectedLocation}
            />
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <InventoryPanel selectedLocation={selectedLocation} />
        </section>
      </div>

      {/* Location card grid */}
      <LocationGroup
        title="Floors"
        items={groupedLocations.floors}
        statsByLocation={statsByLocation}
        criticalByLocation={criticalByLocation}
      />
      <LocationGroup
        title="Storage"
        items={groupedLocations.storage}
        statsByLocation={statsByLocation}
        criticalByLocation={criticalByLocation}
      />
      <LocationGroup
        title="Other"
        items={groupedLocations.other}
        statsByLocation={statsByLocation}
        criticalByLocation={criticalByLocation}
      />
    </div>
  );
}

function LocationGroup({ title, items, statsByLocation, criticalByLocation }) {
  if (!items || items.length === 0) return null;
  return (
    <section>
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        <span className="text-xs text-slate-400">
          {items.length} {items.length === 1 ? "location" : "locations"}
        </span>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((loc) => (
          <LocationCard
            key={loc.id}
            location={loc}
            stats={statsByLocation?.get(loc.id)}
            criticalCount={criticalByLocation?.get(loc.id) ?? 0}
          />
        ))}
      </div>
    </section>
  );
}
