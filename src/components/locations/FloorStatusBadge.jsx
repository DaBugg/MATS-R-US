// Floor status comes from line/unit counts + critical-item count. Tones use
// CSS variables defined in index.css so we stay consistent with the design
// tokens called out by the reformat brief.

const TONES = {
  empty: {
    label: "Empty",
    bg: "bg-[--color-status-empty]/30",
    fg: "text-slate-700",
    dot: "bg-[--color-status-empty]",
    icon: "□",
  },
  active: {
    label: "Active",
    bg: "bg-emerald-100",
    fg: "text-emerald-800",
    dot: "bg-[--color-status-active]",
    icon: "●",
  },
  busy: {
    label: "Busy",
    bg: "bg-orange-100",
    fg: "text-orange-800",
    dot: "bg-[--color-status-busy]",
    icon: "▲",
  },
  low: {
    label: "Low",
    bg: "bg-amber-100",
    fg: "text-amber-800",
    dot: "bg-[--color-status-low]",
    icon: "◆",
  },
  review: {
    label: "Needs Review",
    bg: "bg-violet-100",
    fg: "text-violet-800",
    dot: "bg-[--color-status-review]",
    icon: "★",
  },
};

export default function FloorStatusBadge({ status, label, className = "" }) {
  const tone = TONES[status] ?? TONES.empty;
  const text = label ?? tone.label;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone.bg} ${tone.fg} ${className}`}
    >
      <span aria-hidden="true" className="text-[8px] leading-none">
        {tone.icon}
      </span>
      {text}
    </span>
  );
}

// Derive a status string from raw stats. `criticalCount` is the number of
// rows on this floor that need review (low / missing / TBD).
export function deriveFloorStatus({ lineCount, unitTotal, criticalCount }) {
  if (criticalCount > 0) return "review";
  if (!lineCount) return "empty";
  if (unitTotal >= 200) return "busy";
  if (unitTotal < 25) return "low";
  return "active";
}
