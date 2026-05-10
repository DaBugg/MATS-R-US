import TowerIllustration from "./TowerIllustration.jsx";
import FloorRow from "./FloorRow.jsx";

// North Tower card. Tower illustration is a small, decorative side panel —
// it never has text rendered over it. The floor list is the operational
// data, sitting in its own readable column.
export default function NorthTowerCard({
  buildingName = "North Tower",
  floors,
  statsByLocation,
  criticalByLocation,
  selectedLocationId,
  onSelectLocation,
}) {
  const totals = floors.reduce(
    (acc, f) => {
      const s = statsByLocation?.get(f.id);
      acc.lines += s?.lineCount ?? 0;
      acc.units += s?.unitTotal ?? 0;
      return acc;
    },
    { lines: 0, units: 0 },
  );

  const orderedTopDown = [...floors].sort(
    (a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0),
  );

  return (
    <section
      aria-labelledby="north-tower-heading"
      className="overflow-hidden rounded-2xl border border-[--color-site-border] bg-[--color-site-card] shadow-[--shadow-card]"
    >
      <header className="border-b border-slate-100 bg-[--color-site-muted]/60 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Building
        </p>
        <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="north-tower-heading"
            className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
          >
            {buildingName}
          </h2>
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {floors.length} {floors.length === 1 ? "floor" : "floors"}
            </span>
            <span className="mx-1.5 text-slate-300">·</span>
            {totals.lines} {totals.lines === 1 ? "line" : "lines"}
            <span className="mx-1.5 text-slate-300">·</span>
            {totals.units} {totals.units === 1 ? "unit" : "units"}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[200px_1fr] md:gap-6 md:p-5">
        {/* Decorative tower — no labels, never overlaps anything */}
        <div className="hidden md:flex md:flex-col md:items-center md:justify-start">
          <TowerIllustration floorCount={floors.length || 16} />
          <p className="mt-2 text-center text-[11px] uppercase tracking-wide text-slate-400">
            Site elevation
          </p>
        </div>

        {/* Floor list — readable rows */}
        <div>
          {orderedTopDown.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
              No active floors. Activate floors in your Supabase{" "}
              <code className="rounded bg-slate-100 px-1">locations</code>{" "}
              table.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {orderedTopDown.map((floor) => (
                <li key={floor.id}>
                  <FloorRow
                    location={floor}
                    stats={statsByLocation?.get(floor.id)}
                    criticalCount={criticalByLocation?.get(floor.id) ?? 0}
                    selected={floor.id === selectedLocationId}
                    onSelect={onSelectLocation}
                  />
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
