import { useMemo } from "react";

export default function BuildingMap({
  locations,
  loading,
  selectedLocationId,
  onSelectLocation,
}) {
  const { floors, storage } = useMemo(() => {
    const sorted = [...locations].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    return {
      // Floors stack visually from highest at the top to ground at the bottom.
      floors: sorted
        .filter((l) => l.type === "floor")
        .sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0)),
      storage: sorted.filter((l) => l.type !== "floor"),
    };
  }, [locations]);

  if (loading && locations.length === 0) {
    return (
      <div className="p-4">
        <SectionLabel>Building</SectionLabel>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-md bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!loading && locations.length === 0) {
    return (
      <div className="p-4">
        <SectionLabel>Building</SectionLabel>
        <p className="text-sm text-slate-500">
          No active locations yet. Add one in your Supabase{" "}
          <code className="rounded bg-slate-100 px-1">locations</code> table.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <SectionLabel>Building</SectionLabel>

      <ul className="mb-4 space-y-1.5">
        {floors.map((floor) => (
          <FloorButton
            key={floor.id}
            location={floor}
            selected={floor.id === selectedLocationId}
            onSelect={onSelectLocation}
          />
        ))}
      </ul>

      {storage.length > 0 && (
        <>
          <SectionLabel>Storage</SectionLabel>
          <ul className="space-y-1.5">
            {storage.map((loc) => (
              <StorageButton
                key={loc.id}
                location={loc}
                selected={loc.id === selectedLocationId}
                onSelect={onSelectLocation}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </h2>
  );
}

function FloorButton({ location, selected, onSelect }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(location.id)}
        aria-pressed={selected}
        className={[
          "flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left text-sm transition",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          selected
            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
            : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100",
        ].join(" ")}
      >
        <span className="font-medium">{location.name}</span>
        <span
          className={[
            "rounded px-1.5 py-0.5 text-xs",
            selected ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-600",
          ].join(" ")}
        >
          #{location.sort_order}
        </span>
      </button>
    </li>
  );
}

function StorageButton({ location, selected, onSelect }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(location.id)}
        aria-pressed={selected}
        className={[
          "flex w-full items-center justify-between rounded-md border-2 border-dashed px-3 py-2.5 text-left text-sm transition",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
          selected
            ? "border-amber-600 bg-amber-500 text-white shadow-sm"
            : "border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100",
        ].join(" ")}
      >
        <span className="font-medium">{location.name}</span>
        <span
          className={[
            "rounded px-1.5 py-0.5 text-xs uppercase",
            selected
              ? "bg-amber-600 text-white"
              : "bg-amber-200 text-amber-800",
          ].join(" ")}
        >
          {location.type}
        </span>
      </button>
    </li>
  );
}
