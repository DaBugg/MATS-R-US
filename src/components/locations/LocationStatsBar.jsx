function fmt(n) {
  if (!Number.isFinite(n)) return "0";
  if (Number.isInteger(n)) return new Intl.NumberFormat("en-US").format(n);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n);
}

export default function LocationStatsBar({
  activeFloors = 0,
  totalLines = 0,
  totalUnits = 0,
  connexCount = 0,
  loading = false,
}) {
  return (
    <dl
      aria-label="Site totals"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
    >
      <Stat label="Active Floors" value={loading ? "—" : fmt(activeFloors)} />
      <Stat label="Total Lines" value={loading ? "—" : fmt(totalLines)} />
      <Stat label="Total Units" value={loading ? "—" : fmt(totalUnits)} />
      <Stat
        label="Site Assets"
        value={loading ? "—" : fmt(connexCount)}
        helper={
          connexCount === 1 ? "Connex / storage" : "Connex / storage areas"
        }
      />
    </dl>
  );
}

function Stat({ label, value, helper }) {
  return (
    <div className="rounded-xl border border-[--color-site-border] bg-[--color-site-card] px-3 py-3 shadow-sm sm:px-4">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </dd>
      {helper && (
        <p className="mt-0.5 text-[11px] text-slate-500">{helper}</p>
      )}
    </div>
  );
}
