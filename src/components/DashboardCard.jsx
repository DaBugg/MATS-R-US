export default function DashboardCard({
  label,
  value,
  helper,
  tone = "default",
  icon,
}) {
  const accent = TONES[tone] ?? TONES.default;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </div>
        {icon && (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-md ${accent.iconBg} ${accent.iconFg}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
      <div className={`mt-2 text-3xl font-bold tracking-tight ${accent.value}`}>
        {value}
      </div>
      {helper && (
        <p className="mt-1 text-xs text-slate-500">{helper}</p>
      )}
    </div>
  );
}

const TONES = {
  default: {
    iconBg: "bg-slate-100",
    iconFg: "text-slate-700",
    value: "text-slate-900",
  },
  good: {
    iconBg: "bg-emerald-100",
    iconFg: "text-emerald-700",
    value: "text-slate-900",
  },
  warn: {
    iconBg: "bg-amber-100",
    iconFg: "text-amber-700",
    value: "text-slate-900",
  },
  danger: {
    iconBg: "bg-rose-100",
    iconFg: "text-rose-700",
    value: "text-slate-900",
  },
  info: {
    iconBg: "bg-sky-100",
    iconFg: "text-sky-700",
    value: "text-slate-900",
  },
};
