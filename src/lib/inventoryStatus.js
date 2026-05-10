// Soft client-side inventory status heuristic. The MVP schema doesn't track
// minimum_quantity per material — when we add it later, replace this file's
// thresholds with the per-material values.

const LOW_STOCK_THRESHOLD = 10;

export const STATUS = {
  OK: "ok",
  LOW: "low",
  MISSING: "missing",
  REVIEW: "review",
  UNKNOWN: "unknown",
};

export function getStatus(row) {
  if (!row) return STATUS.UNKNOWN;
  const qty = Number(row.quantity ?? 0);
  if (typeof row.notes === "string" && row.notes.includes("[qty TBD]")) {
    return STATUS.REVIEW;
  }
  if (qty <= 0) return STATUS.MISSING;
  if (qty < LOW_STOCK_THRESHOLD) return STATUS.LOW;
  return STATUS.OK;
}

export const STATUS_LABEL = {
  [STATUS.OK]: "In Stock",
  [STATUS.LOW]: "Low Stock",
  [STATUS.MISSING]: "Missing",
  [STATUS.REVIEW]: "Needs Review",
  [STATUS.UNKNOWN]: "—",
};

// Tailwind class fragments for badge backgrounds + text.
export const STATUS_TONE = {
  [STATUS.OK]: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  [STATUS.LOW]: "bg-amber-100 text-amber-800 ring-amber-200",
  [STATUS.MISSING]: "bg-rose-100 text-rose-800 ring-rose-200",
  [STATUS.REVIEW]: "bg-sky-100 text-sky-800 ring-sky-200",
  [STATUS.UNKNOWN]: "bg-slate-100 text-slate-700 ring-slate-200",
};
