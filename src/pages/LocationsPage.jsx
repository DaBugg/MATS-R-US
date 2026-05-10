import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import LocationStatsBar from "../components/locations/LocationStatsBar.jsx";
import NorthTowerCard from "../components/locations/NorthTowerCard.jsx";
import ConnexLocationCard from "../components/locations/ConnexLocationCard.jsx";
import LocationDetailPanel from "../components/locations/LocationDetailPanel.jsx";
import { useLocations } from "../hooks/useLocations.js";
import { useInventoryStats } from "../hooks/useInventoryStats.js";
import { useAllInventory } from "../hooks/useAllInventory.js";
import { getStatus, STATUS } from "../lib/inventoryStatus.js";

export default function LocationsPage() {
  const { activeLocations, loading: locLoading } = useLocations();
  const { statsByLocation } = useInventoryStats();
  const { items: allItems } = useAllInventory();

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLocationId = searchParams.get("location") ?? null;

  const selectedLocation = useMemo(
    () => activeLocations.find((l) => l.id === selectedLocationId) ?? null,
    [activeLocations, selectedLocationId],
  );

  const setSelectedLocation = (id) => {
    if (id) {
      setSearchParams({ location: id }, { replace: false });
    } else {
      setSearchParams({}, { replace: false });
    }
  };

  // Drop a stale ?location= when locations finish loading and the id isn't real.
  useEffect(() => {
    if (
      !locLoading &&
      selectedLocationId &&
      !activeLocations.some((l) => l.id === selectedLocationId)
    ) {
      setSearchParams({}, { replace: true });
    }
  }, [locLoading, selectedLocationId, activeLocations, setSearchParams]);

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

  const grouped = useMemo(() => {
    const sorted = [...activeLocations].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    return {
      floors: sorted.filter((l) => l.type === "floor"),
      storage: sorted.filter((l) => l.type === "storage"),
      other: sorted.filter((l) => l.type === "other"),
    };
  }, [activeLocations]);

  // Top-level totals for the stats bar.
  const totals = useMemo(() => {
    let lines = 0;
    let units = 0;
    for (const [, s] of statsByLocation) {
      lines += s.lineCount;
      units += s.unitTotal;
    }
    return { lines, units };
  }, [statsByLocation]);

  const connexCount = grouped.storage.length + grouped.other.length;

  return (
    <div className="pb-20 md:pb-0">
      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Site Logistics
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Locations
          </h1>
          <p className="mt-1 max-w-prose text-sm text-slate-500">
            Track materials by tower, floor, and connex. Click any floor or
            site asset to see what's there and run actions.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-5">
        <LocationStatsBar
          activeFloors={grouped.floors.length}
          totalLines={totals.lines}
          totalUnits={totals.units}
          connexCount={connexCount}
          loading={locLoading}
        />
      </div>

      {/* Main grid: tower + floors on left, detail panel on right (desktop). */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
        <div className="space-y-4">
          <NorthTowerCard
            buildingName="North Tower"
            floors={grouped.floors}
            statsByLocation={statsByLocation}
            criticalByLocation={criticalByLocation}
            selectedLocationId={selectedLocationId}
            onSelectLocation={setSelectedLocation}
          />

          {/* Site assets — connex boxes + other locations */}
          {(grouped.storage.length > 0 || grouped.other.length > 0) && (
            <section
              aria-labelledby="site-assets-heading"
              className="rounded-2xl border border-[--color-site-border] bg-[--color-site-card] shadow-sm"
            >
              <header className="border-b border-slate-100 bg-[--color-site-muted]/60 px-5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Site assets
                </p>
                <h2
                  id="site-assets-heading"
                  className="text-base font-semibold text-slate-900"
                >
                  Connex & Other Locations
                </h2>
              </header>
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:p-5">
                {[...grouped.storage, ...grouped.other].map((loc) => (
                  <ConnexLocationCard
                    key={loc.id}
                    location={loc}
                    stats={statsByLocation.get(loc.id)}
                    criticalCount={criticalByLocation.get(loc.id) ?? 0}
                    selected={loc.id === selectedLocationId}
                    onSelect={setSelectedLocation}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Desktop side panel */}
        <aside className="hidden xl:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-[--color-site-border] bg-[--color-site-card] shadow-sm">
            <LocationDetailPanel location={selectedLocation} />
          </div>
        </aside>
      </div>

      {/* Mobile / tablet bottom sheet for selected location */}
      {selectedLocation && (
        <div className="fixed inset-x-0 bottom-0 z-40 xl:hidden">
          <button
            type="button"
            onClick={() => setSelectedLocation(null)}
            aria-label="Close location details"
            className="absolute inset-x-0 -top-4 mx-auto block h-4 cursor-default"
          />
          <div className="mx-auto max-h-[78vh] w-full overflow-hidden rounded-t-2xl border border-b-0 border-slate-200 bg-white shadow-2xl">
            <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-slate-300" aria-hidden="true" />
            <div className="max-h-[72vh] overflow-y-auto">
              <LocationDetailPanel
                location={selectedLocation}
                onClose={() => setSelectedLocation(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile sticky bottom actions when no location selected */}
      {!selectedLocation && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-md gap-2">
            <Link
              to="/add"
              className="inline-flex flex-1 items-center justify-center rounded-md bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              + Add Material
            </Link>
            <Link
              to="/inventory"
              className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              All Inventory
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
