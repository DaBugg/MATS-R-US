import FloorStatusBadge, { deriveFloorStatus } from "./FloorStatusBadge.jsx";

function fmt(n) {
  if (!Number.isFinite(n)) return "0";
  if (Number.isInteger(n)) return new Intl.NumberFormat("en-US").format(n);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

// Connex Box treated as a real location, not a floating overlay. Visual
// glyph is contained inside a small thumbnail so the orange illustration
// never bleeds across other content.
export default function ConnexLocationCard({
  location,
  stats,
  criticalCount = 0,
  selected = false,
  onSelect,
}) {
  if (!location) return null;
  const lineCount = stats?.lineCount ?? 0;
  const unitTotal = stats?.unitTotal ?? 0;
  const status = deriveFloorStatus({ lineCount, unitTotal, criticalCount });

  return (
    <button
      type="button"
      onClick={() => onSelect?.(location.id)}
      aria-pressed={selected}
      aria-label={`${location.name}: ${lineCount} lines, ${unitTotal} units${selected ? " (selected)" : ""}`}
      className={[
        "group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
        selected
          ? "border-orange-400 bg-orange-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
      ].join(" ")}
    >
      <ConnexThumb selected={selected} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="block truncate text-sm font-semibold text-slate-900">
            {location.name}
          </span>
          <FloorStatusBadge status={status} />
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {lineCount === 0
            ? "Empty"
            : `${fmt(lineCount)} ${lineCount === 1 ? "line" : "lines"} · ${fmt(unitTotal)} ${unitTotal === 1 ? "unit" : "units"}`}
        </p>
        <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">
          {location.type === "storage" ? "Site asset" : "Other location"}
        </p>
      </div>
    </button>
  );
}

function ConnexThumb({ selected }) {
  // Compact 56×40 connex glyph contained inside a rounded box.
  return (
    <span
      className={[
        "flex h-12 w-14 flex-shrink-0 items-center justify-center rounded-md",
        selected ? "ring-2 ring-orange-400" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <svg viewBox="0 0 56 40" className="h-12 w-14">
        <defs>
          <linearGradient id="connexCardOrange" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f4a36f" />
            <stop offset="100%" stopColor="#e28552" />
          </linearGradient>
        </defs>
        <rect
          x="3"
          y="6"
          width="50"
          height="28"
          rx="2"
          fill="url(#connexCardOrange)"
          stroke="#7a442d"
          strokeWidth="1.5"
        />
        <rect x="3" y="6" width="50" height="3" fill="#d97845" />
        <rect x="3" y="31" width="50" height="3" fill="#c96c3d" />
        {[8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48].map((cx) => (
          <line
            key={cx}
            x1={cx}
            y1="11"
            x2={cx}
            y2="29"
            stroke="#ab5e3d"
            strokeWidth="0.8"
          />
        ))}
        <line
          x1="27.5"
          y1="9"
          x2="27.5"
          y2="31"
          stroke="#8a4b31"
          strokeWidth="1"
        />
      </svg>
    </span>
  );
}
