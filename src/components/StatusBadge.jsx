import { STATUS, STATUS_LABEL, STATUS_TONE } from "../lib/inventoryStatus.js";

export default function StatusBadge({ status, children, className = "" }) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE[STATUS.UNKNOWN];
  const label = children ?? STATUS_LABEL[status] ?? STATUS_LABEL[STATUS.UNKNOWN];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone} ${className}`}
    >
      <span
        aria-hidden="true"
        className={[
          "h-1.5 w-1.5 rounded-full",
          status === STATUS.OK && "bg-emerald-500",
          status === STATUS.LOW && "bg-amber-500",
          status === STATUS.MISSING && "bg-rose-500",
          status === STATUS.REVIEW && "bg-sky-500",
          status === STATUS.UNKNOWN && "bg-slate-400",
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {label}
    </span>
  );
}
