import { Link } from "react-router-dom";
import { useMemo } from "react";
import DashboardCard from "../components/DashboardCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ActivityFeed from "../components/ActivityFeed.jsx";
import { useLocations } from "../hooks/useLocations.js";
import { useAllInventory } from "../hooks/useAllInventory.js";
import { getStatus, STATUS } from "../lib/inventoryStatus.js";

function fmt(n) {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export default function DashboardPage() {
  const { activeLocations, loading: locLoading } = useLocations();
  const { items, loading: invLoading } = useAllInventory();

  const summary = useMemo(() => {
    let total = 0;
    let units = 0;
    const critical = [];
    for (const row of items) {
      total += 1;
      units += Number(row.quantity ?? 0);
      const s = getStatus(row);
      if (s === STATUS.LOW || s === STATUS.MISSING || s === STATUS.REVIEW) {
        critical.push({ ...row, _status: s });
      }
    }
    critical.sort((a, b) => {
      const order = { [STATUS.MISSING]: 0, [STATUS.REVIEW]: 1, [STATUS.LOW]: 2 };
      return (order[a._status] ?? 9) - (order[b._status] ?? 9);
    });
    return {
      totalLines: total,
      totalUnits: units,
      critical,
      lowStockCount: critical.length,
    };
  }, [items]);

  const recentlyUpdated = useMemo(() => {
    return [...items]
      .sort(
        (a, b) =>
          new Date(b.updated_at ?? 0).getTime() -
          new Date(a.updated_at ?? 0).getTime(),
      )
      .slice(0, 8);
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Site Overview
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            What is happening on the jobsite right now.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <section
        aria-label="Inventory summary"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <DashboardCard
          label="Total Lines"
          value={invLoading ? "—" : fmt(summary.totalLines)}
          helper={`${fmt(summary.totalUnits)} total units across all locations`}
          tone="info"
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 7h18M3 12h18M3 17h12" strokeLinecap="round" />
            </svg>
          }
        />
        <DashboardCard
          label="Needs Review"
          value={invLoading ? "—" : fmt(summary.lowStockCount)}
          helper={
            summary.lowStockCount === 0
              ? "Nothing flagged. Inventory looks healthy."
              : "Low stock, missing, or needs count"
          }
          tone={summary.lowStockCount > 0 ? "warn" : "good"}
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
              <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          }
        />
        <DashboardCard
          label="Locations Tracked"
          value={locLoading ? "—" : fmt(activeLocations.length)}
          helper="Active floors and storage areas"
          tone="default"
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 21V8l8-5 8 5v13" />
              <path d="M9 21v-7h6v7" />
            </svg>
          }
        />
        <DashboardCard
          label="Recent Updates"
          value={invLoading ? "—" : fmt(recentlyUpdated.length)}
          helper={
            recentlyUpdated[0]?.updated_at
              ? `Last edit: ${new Date(recentlyUpdated[0].updated_at).toLocaleString()}`
              : "No edits yet"
          }
          tone="info"
          icon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </section>

      {/* Critical / Recent layout */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Critical Items
              </h2>
              <p className="text-xs text-slate-500">
                Low stock, missing, or flagged for review
              </p>
            </div>
            <Link
              to="/inventory"
              className="text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              View all →
            </Link>
          </header>
          {invLoading ? (
            <CriticalLoading />
          ) : summary.critical.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Nothing critical right now"
                hint="No low-stock items, missing rows, or items pending review."
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.critical.slice(0, 6).map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {row.material?.name ?? "—"}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {row.location?.name ?? "—"}
                      {row.supplier?.name ? ` · ${row.supplier.name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-slate-700">
                      {row.quantity}
                      {row.unit ? ` ${row.unit}` : ""}
                    </span>
                    <StatusBadge status={row._status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Recent Activity
            </h2>
            <p className="text-xs text-slate-500">
              Most recently edited inventory rows
            </p>
          </header>
          <ActivityFeed items={recentlyUpdated} />
        </section>
      </div>
    </div>
  );
}

function CriticalLoading() {
  return (
    <ul className="divide-y divide-slate-100">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <div className="flex-1 space-y-1">
            <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100" />
            <div className="h-2.5 w-2/5 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100" />
        </li>
      ))}
    </ul>
  );
}
