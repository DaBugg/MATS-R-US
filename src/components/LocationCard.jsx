import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge.jsx";
import { STATUS } from "../lib/inventoryStatus.js";

function fmt(n) {
  if (!Number.isFinite(n)) return "0";
  if (Number.isInteger(n)) return new Intl.NumberFormat("en-US").format(n);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

export default function LocationCard({ location, stats, criticalCount = 0 }) {
  const lineCount = stats?.lineCount ?? 0;
  const unitTotal = stats?.unitTotal ?? 0;

  const status =
    criticalCount > 0
      ? STATUS.LOW
      : lineCount === 0
        ? STATUS.UNKNOWN
        : STATUS.OK;
  const statusLabel =
    criticalCount > 0
      ? `${criticalCount} ${criticalCount === 1 ? "item needs review" : "items need review"}`
      : lineCount === 0
        ? "Empty"
        : "Clear";

  const typeLabel =
    location.type === "floor"
      ? "Floor"
      : location.type === "storage"
        ? "Storage"
        : "Other";

  return (
    <Link
      to={`/locations?location=${location.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {typeLabel}
          </p>
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-slate-950">
            {location.name}
          </h3>
        </div>
        <StatusBadge status={status}>{statusLabel}</StatusBadge>
      </div>

      <dl className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Lines
          </dt>
          <dd className="font-semibold text-slate-900">{fmt(lineCount)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Units
          </dt>
          <dd className="font-semibold text-slate-900">{fmt(unitTotal)}</dd>
        </div>
      </dl>
    </Link>
  );
}
