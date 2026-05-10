import FloorStatusBadge, { deriveFloorStatus } from "./FloorStatusBadge.jsx";

function fmt(n) {
  if (!Number.isFinite(n)) return "0";
  if (Number.isInteger(n)) return new Intl.NumberFormat("en-US").format(n);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

// A single readable floor row. Real <button> for accessibility, focus ring,
// hover/selected state. Numbers and labels live OUTSIDE any background
// graphic so nothing overlaps the building illustration.
export default function FloorRow({
  location,
  stats,
  criticalCount = 0,
  selected = false,
  onSelect,
}) {
  const lineCount = stats?.lineCount ?? 0;
  const unitTotal = stats?.unitTotal ?? 0;
  const status = deriveFloorStatus({ lineCount, unitTotal, criticalCount });
  const tag = `L${location.sort_order ?? "?"}`;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(location.id)}
      aria-pressed={selected}
      aria-label={`${location.name}: ${lineCount} ${lineCount === 1 ? "line" : "lines"}, ${unitTotal} ${unitTotal === 1 ? "unit" : "units"}${selected ? " (selected)" : ""}`}
      className={[
        "group grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
        selected
          ? "border-orange-300 bg-orange-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex h-7 min-w-[34px] items-center justify-center rounded-md px-1.5 font-mono text-[11px] font-semibold tabular-nums",
          selected
            ? "bg-orange-600 text-white"
            : "bg-slate-900 text-white group-hover:bg-slate-800",
        ].join(" ")}
        aria-hidden="true"
      >
        {tag}
      </span>

      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-900">
          {location.name}
        </span>
        <span className="block truncate text-xs text-slate-500">
          {lineCount === 0
            ? "No materials logged"
            : `${fmt(lineCount)} ${lineCount === 1 ? "line" : "lines"} · ${fmt(unitTotal)} ${unitTotal === 1 ? "unit" : "units"}`}
        </span>
      </span>

      <FloorStatusBadge status={status} />
    </button>
  );
}
