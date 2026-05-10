import { HEAT_BUCKETS } from "../../lib/heatMap.js";

// Small inline legend for the heat-tinted floor / connex rows. Each swatch
// is labeled so the gradient can be scanned without color-only reliance.
export default function HeatKey({ className = "", compact = false }) {
  return (
    <div
      role="img"
      aria-label="Heat key: white means no items, orange means many items"
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Heat
      </span>
      <ul className="flex items-center gap-0">
        {HEAT_BUCKETS.map((b, i) => (
          <li
            key={b.level}
            className={[
              "h-3 w-6",
              b.swatch,
              i === 0 ? "rounded-l" : "",
              i === HEAT_BUCKETS.length - 1 ? "rounded-r" : "",
              i > 0 ? "-ml-px" : "",
            ].join(" ")}
            title={b.label}
          />
        ))}
      </ul>
      {!compact && (
        <span className="flex items-center gap-1 text-[10px] text-slate-500">
          <span>None</span>
          <span aria-hidden="true">→</span>
          <span>Most</span>
        </span>
      )}
    </div>
  );
}
