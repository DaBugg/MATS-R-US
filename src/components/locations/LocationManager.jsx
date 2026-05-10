import { useMemo, useState } from "react";
import { useLocations } from "../../hooks/useLocations.js";

const TYPE_OPTIONS = [
  { value: "floor", label: "Floor" },
  { value: "storage", label: "Connex / Storage" },
  { value: "other", label: "Other" },
];

// Minimal "Add Floor / Storage" form. Wires straight into the existing
// useLocations hook — same realtime channel keeps every other component in
// sync the moment the row is committed.
export default function LocationManager() {
  const { addLocation, locations } = useLocations();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("floor");
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const nextSuggestedSort = useMemo(() => {
    const same = (locations ?? []).filter((l) => l.type === type);
    if (same.length === 0) return type === "floor" ? 1 : 100;
    return same.reduce((m, l) => Math.max(m, l.sort_order ?? 0), 0) + 1;
  }, [locations, type]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    const sortValue =
      sortOrder === "" ? nextSuggestedSort : Number(sortOrder);
    if (!Number.isFinite(sortValue)) {
      setError("Sort order must be a number.");
      return;
    }

    setSubmitting(true);
    try {
      await addLocation({
        name: trimmedName,
        type,
        sort_order: sortValue,
      });
      setSuccess(`Added "${trimmedName}".`);
      setName("");
      setSortOrder("");
    } catch (err) {
      setError(err?.message ?? "Failed to add location.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="location-manager-heading"
      className="overflow-hidden rounded-2xl border border-[--color-site-border] bg-[--color-site-card] shadow-sm"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
        aria-expanded={open}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Manage
          </p>
          <h3
            id="location-manager-heading"
            className="text-base font-semibold text-slate-900"
          >
            Add Floor or Storage
          </h3>
        </div>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            d="M6 9l6 6 6-6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 border-t border-slate-100 p-4"
        >
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={inputClass}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name" required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                type === "floor"
                  ? "Floor 22"
                  : type === "storage"
                    ? "Connex B"
                    : "PBAU"
              }
              required
              className={inputClass}
            />
          </Field>
          <Field
            label="Sort order"
            helper={`Higher number = upper floor. Suggested: ${nextSuggestedSort}.`}
          >
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder={String(nextSuggestedSort)}
              className={inputClass}
            />
          </Field>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"
            >
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Adding…" : "Add Location"}
          </button>
        </form>
      )}
    </section>
  );
}

function Field({ label, helper, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </span>
      {children}
      {helper && (
        <span className="mt-1 block text-[11px] text-slate-500">{helper}</span>
      )}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
