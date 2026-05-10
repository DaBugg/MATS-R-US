import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import SearchInput from "../components/SearchInput.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import EmptyState from "../components/EmptyState.jsx";
import MaterialMovementDrawer from "../components/inventory/MaterialMovementDrawer.jsx";
import { useAllInventory } from "../hooks/useAllInventory.js";
import { useLocations } from "../hooks/useLocations.js";
import { getStatus, STATUS } from "../lib/inventoryStatus.js";
import { displayName } from "../lib/displayName.js";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: STATUS.OK, label: "In Stock" },
  { value: STATUS.LOW, label: "Low Stock" },
  { value: STATUS.MISSING, label: "Missing" },
  { value: STATUS.REVIEW, label: "Needs Review" },
];

function fmt(n) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    Number(n) || 0,
  );
}

// Search across material name, location, supplier, unit, and notes — no
// SKU/category columns yet (see TODO_DATABASE_MIGRATION.md), but if/when
// they're added the haystack just needs an extra concat.
function makeSearcher(q) {
  if (!q) return () => true;
  const needle = q.toLowerCase();
  return (row) => {
    const hay = [
      row.material?.name,
      row.location?.name,
      row.supplier?.name,
      row.unit,
      row.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  };
}

export default function InventoryPage() {
  const { items, loading, error } = useAllInventory();
  const { activeLocations } = useLocations();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [locationId, setLocationId] = useState(
    searchParams.get("location") ?? "all",
  );
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("updated_at");
  const [drawer, setDrawer] = useState({ mode: null, row: null });

  // Debounce search input ~250ms — keeps the table snappy on long lists.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Keep location filter in sync with URL when navigating from elsewhere.
  useEffect(() => {
    const fromUrl = searchParams.get("location") ?? "all";
    if (fromUrl !== locationId) setLocationId(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleLocationChange = (id) => {
    setLocationId(id);
    if (id === "all") {
      const next = new URLSearchParams(searchParams);
      next.delete("location");
      setSearchParams(next, { replace: true });
    } else {
      setSearchParams({ location: id }, { replace: true });
    }
  };

  const filtered = useMemo(() => {
    const matchesSearch = makeSearcher(debouncedSearch);
    const out = items.filter((row) => {
      if (locationId !== "all" && row.location?.id !== locationId) return false;
      if (status !== "all" && getStatus(row) !== status) return false;
      if (!matchesSearch(row)) return false;
      return true;
    });

    const sortFns = {
      updated_at: (a, b) =>
        new Date(b.updated_at ?? 0).getTime() -
        new Date(a.updated_at ?? 0).getTime(),
      quantity: (a, b) => Number(b.quantity ?? 0) - Number(a.quantity ?? 0),
      name: (a, b) =>
        (a.material?.name ?? "").localeCompare(b.material?.name ?? ""),
      location: (a, b) =>
        (a.location?.sort_order ?? 0) - (b.location?.sort_order ?? 0) ||
        (a.location?.name ?? "").localeCompare(b.location?.name ?? ""),
    };
    return out.sort(sortFns[sortBy] ?? sortFns.updated_at);
  }, [items, debouncedSearch, locationId, status, sortBy]);

  const filteredLocationName =
    locationId === "all"
      ? null
      : (activeLocations.find((l) => l.id === locationId)?.name ?? null);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Materials
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? "Loading inventory…"
              : `${filtered.length} of ${items.length} ${items.length === 1 ? "row" : "rows"} shown`}
            {filteredLocationName && (
              <>
                <span className="mx-1.5 text-slate-300">·</span>
                Filtered to{" "}
                <span className="font-medium text-slate-700">
                  {filteredLocationName}
                </span>
                <button
                  type="button"
                  onClick={() => handleLocationChange("all")}
                  className="ml-2 text-xs text-blue-700 hover:text-blue-800"
                >
                  Clear
                </button>
              </>
            )}
          </p>
        </div>
        <Link
          to="/add"
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          + Add Material
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search material, floor, connex, supplier, or notes…"
          />
          <select
            aria-label="Filter by location"
            value={locationId}
            onChange={(e) => handleLocationChange(e.target.value)}
            className={selectClass}
          >
            <option value="all">All locations</option>
            {activeLocations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectClass}
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={selectClass}
          >
            <option value="updated_at">Most recent</option>
            <option value="name">Material name</option>
            <option value="quantity">Quantity (high → low)</option>
            <option value="location">Location</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          Failed to load inventory: {error.message}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          title={
            items.length === 0
              ? "No materials added yet"
              : "No matches for these filters"
          }
          hint={
            items.length === 0
              ? "Start by adding a material from the field, or run the seed SQL files."
              : "Try clearing a filter or adjusting your search."
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
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
          <div className="max-h-[70vh] overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Material</th>
                  <th className="px-4 py-2 font-medium">Quantity</th>
                  <th className="px-4 py-2 font-medium">Unit</th>
                  <th className="px-4 py-2 font-medium">Location</th>
                  <th className="px-4 py-2 font-medium">Supplier</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Updated</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {displayName(row.material?.name)}
                      {row.notes && (
                        <p className="mt-0.5 text-xs font-normal text-slate-500">
                          {row.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-slate-800">
                      {fmt(row.quantity)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {row.unit || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/locations?location=${row.location?.id}`}
                        className="text-blue-700 hover:text-blue-800"
                      >
                        {row.location?.name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {row.supplier?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={getStatus(row)} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">
                      {row.updated_at
                        ? new Date(row.updated_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <ActionButton
                          tone="emerald"
                          onClick={() => setDrawer({ mode: "add", row })}
                        >
                          + Add
                        </ActionButton>
                        <ActionButton
                          tone="rose"
                          onClick={() => setDrawer({ mode: "subtract", row })}
                        >
                          − Sub
                        </ActionButton>
                        <ActionButton
                          tone="blue"
                          onClick={() => setDrawer({ mode: "move", row })}
                        >
                          → Move
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile cards */}
      {filtered.length > 0 && (
        <ul className="space-y-2 md:hidden">
          {filtered.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {displayName(row.material?.name)}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    <Link
                      to={`/locations?location=${row.location?.id}`}
                      className="text-blue-700 hover:text-blue-800"
                    >
                      {row.location?.name ?? "—"}
                    </Link>
                    {row.supplier?.name ? ` · ${row.supplier.name}` : ""}
                  </p>
                </div>
                <StatusBadge status={getStatus(row)} />
              </div>
              <div className="mt-2 flex items-baseline gap-2 text-sm">
                <span className="font-mono text-base font-semibold text-slate-900">
                  {fmt(row.quantity)}
                </span>
                <span className="text-slate-500">{row.unit || "—"}</span>
              </div>
              {row.notes && (
                <p className="mt-1 text-xs text-slate-500">{row.notes}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <ActionButton
                  tone="emerald"
                  onClick={() => setDrawer({ mode: "add", row })}
                >
                  + Add
                </ActionButton>
                <ActionButton
                  tone="rose"
                  onClick={() => setDrawer({ mode: "subtract", row })}
                >
                  − Subtract
                </ActionButton>
                <ActionButton
                  tone="blue"
                  onClick={() => setDrawer({ mode: "move", row })}
                >
                  → Move
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MaterialMovementDrawer
        mode={drawer.mode}
        row={drawer.row}
        locations={activeLocations}
        onClose={() => setDrawer({ mode: null, row: null })}
      />
    </>
  );
}

function ActionButton({ tone, onClick, children }) {
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

const selectClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
