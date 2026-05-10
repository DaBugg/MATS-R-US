import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SearchInput from "../SearchInput.jsx";
import StatusBadge from "../StatusBadge.jsx";
import EmptyState from "../EmptyState.jsx";
import MaterialMovementDrawer from "../inventory/MaterialMovementDrawer.jsx";
import { useInventory } from "../../hooks/useInventory.js";
import { useLocations } from "../../hooks/useLocations.js";
import { displayName } from "../../lib/displayName.js";
import { getStatus } from "../../lib/inventoryStatus.js";

function fmt(n) {
  if (!Number.isFinite(n)) return "0";
  if (Number.isInteger(n)) return new Intl.NumberFormat("en-US").format(n);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

const TYPE_LABEL = {
  floor: "Floor",
  storage: "Connex / Storage",
  other: "Other location",
};

// Right-hand panel on desktop; bottom sheet on mobile (parent container
// chooses where to render this).
export default function LocationDetailPanel({ location, onClose }) {
  const { items, loading, error } = useInventory(location?.id ?? null);
  const { activeLocations } = useLocations();

  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState({ mode: null, row: null });

  const totals = useMemo(() => {
    let units = 0;
    for (const r of items) units += Number(r.quantity ?? 0);
    return { lineCount: items.length, unitTotal: units };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const hay = [row.material?.name, row.supplier?.name, row.unit, row.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, search]);

  if (!location) {
    return (
      <div className="flex h-full min-h-[260px] items-center justify-center p-6 text-center">
        <div>
          <p className="text-sm font-medium text-slate-700">
            Pick a location
          </p>
          <p className="mt-1 max-w-prose text-xs text-slate-500">
            Click any floor on the building or the Connex card to see its
            material lines and run actions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 md:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {TYPE_LABEL[location.type] ?? "Location"}
          </p>
          <h3 className="truncate text-lg font-semibold text-slate-900">
            {location.name}
          </h3>
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {fmt(totals.lineCount)}
            </span>{" "}
            {totals.lineCount === 1 ? "line" : "lines"}
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-semibold text-slate-700">
              {fmt(totals.unitTotal)}
            </span>{" "}
            {totals.unitTotal === 1 ? "unit" : "units"}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail panel"
            className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </header>

      <div className="border-b border-slate-100 px-4 py-3 md:px-5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search ${location.name}…`}
        />
      </div>

      {error && (
        <div className="m-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          Failed to load inventory: {error.message}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <LoadingRows />
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title={
                items.length === 0
                  ? "No materials logged here yet"
                  : "No matches"
              }
              hint={
                items.length === 0
                  ? "Use Add Material to log what's stored at this location."
                  : `No results for "${search}".`
              }
              action={
                items.length === 0 ? (
                  <Link
                    to="/add"
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                  >
                    Add Material
                  </Link>
                ) : null
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <li key={row.id} className="px-4 py-3 md:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {displayName(row.material?.name)}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      <span className="font-mono tabular-nums text-slate-700">
                        {fmt(row.quantity)}
                        {row.unit ? ` ${row.unit}` : ""}
                      </span>
                      {row.supplier?.name && (
                        <>
                          <span className="mx-1.5 text-slate-300">·</span>
                          {row.supplier.name}
                        </>
                      )}
                    </p>
                    {row.notes && (
                      <p className="mt-1 truncate text-[11px] text-slate-500">
                        {row.notes}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={getStatus(row)} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <RowAction
                    tone="emerald"
                    onClick={() => setDrawer({ mode: "add", row })}
                  >
                    + Add
                  </RowAction>
                  <RowAction
                    tone="rose"
                    onClick={() => setDrawer({ mode: "subtract", row })}
                  >
                    − Subtract
                  </RowAction>
                  <RowAction
                    tone="blue"
                    onClick={() => setDrawer({ mode: "move", row })}
                  >
                    → Move
                  </RowAction>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 md:px-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Link
            to={`/inventory?location=${location.id}`}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            View full inventory
          </Link>
          <Link
            to="/add"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Add Material
          </Link>
        </div>
      </footer>

      <MaterialMovementDrawer
        mode={drawer.mode}
        row={drawer.row}
        locations={activeLocations}
        onClose={() => setDrawer({ mode: null, row: null })}
      />
    </div>
  );
}

function RowAction({ tone, onClick, children }) {
  const tones = {
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    rose: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    blue: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold ${tones[tone]} focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-400`}
    >
      {children}
    </button>
  );
}

function LoadingRows() {
  return (
    <ul className="space-y-2 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="h-16 animate-pulse rounded-md bg-slate-100"
        />
      ))}
    </ul>
  );
}
