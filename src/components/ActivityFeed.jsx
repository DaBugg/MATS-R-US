function timeAgo(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ActivityFeed({ items, limit = 8 }) {
  const rows = (items ?? []).slice(0, limit);
  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-slate-500">
        No recent inventory updates yet. Add your first material to begin tracking.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-900">
              {row.material?.name ?? "—"}
            </p>
            <p className="truncate text-xs text-slate-500">
              {row.location?.name ?? "—"}
              {row.supplier?.name ? ` · ${row.supplier.name}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs text-slate-700">
              {row.quantity}
              {row.unit ? ` ${row.unit}` : ""}
            </p>
            <p className="text-[11px] text-slate-400">
              {timeAgo(row.updated_at ?? row.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
