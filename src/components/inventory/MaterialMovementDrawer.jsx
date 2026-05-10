import { useEffect, useId, useRef, useState } from "react";
import { useInventoryActions } from "../../hooks/useInventoryActions.js";
import { displayName } from "../../lib/displayName.js";

const SUBTRACT_REASONS = [
  "Installed",
  "Damaged",
  "Moved offsite",
  "Count correction",
  "Other",
];

// One drawer-styled modal that handles all three flows: add, subtract, move.
// Caller controls open/close + provides the selected `row` and (for move) a
// list of destination `locations`. The modal traps focus and closes on Esc.
export default function MaterialMovementDrawer({
  mode,
  row,
  locations = [],
  onClose,
}) {
  const open = Boolean(mode && row);
  if (!open) return null;
  return (
    <DrawerInner mode={mode} row={row} locations={locations} onClose={onClose} />
  );
}

function DrawerInner({ mode, row, locations, onClose }) {
  const titleId = useId();
  const headingRef = useRef(null);
  const containerRef = useRef(null);
  const { addQuantity, subtractQuantity, moveQuantity } = useInventoryActions();

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("Installed");
  const [notes, setNotes] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const available = Number(row?.quantity ?? 0);
  const unit = row?.unit ?? "";
  const materialName = displayName(row?.material?.name ?? "");

  useEffect(() => {
    headingRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const config = MODE_CONFIG[mode];

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      setError("Enter a positive number.");
      return;
    }
    if ((mode === "subtract" || mode === "move") && num > available) {
      setError(`Only ${available}${unit ? " " + unit : ""} available.`);
      return;
    }
    if (mode === "move" && !toLocationId) {
      setError("Pick a destination location.");
      return;
    }
    if (mode === "move" && toLocationId === row.location?.id) {
      setError("Destination must be different from the current location.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "add") {
        await addQuantity({ rowId: row.id, amount: num, notes });
      } else if (mode === "subtract") {
        await subtractQuantity({ rowId: row.id, amount: num, reason, notes });
      } else if (mode === "move") {
        await moveQuantity({
          fromRowId: row.id,
          toLocationId,
          amount: num,
          notes,
        });
      }
      onClose?.({ ok: true });
    } catch (err) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
    >
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={() => onClose?.()}
        aria-hidden="true"
      />

      <div
        ref={containerRef}
        className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl md:max-w-lg md:rounded-2xl"
      >
        <header className={`px-5 py-4 ${config.headerBg}`}>
          <p
            className={`text-[11px] font-semibold uppercase tracking-wide ${config.headerLabel}`}
          >
            {config.label}
          </p>
          <h2
            id={titleId}
            ref={headingRef}
            tabIndex={-1}
            className="mt-0.5 text-lg font-semibold text-slate-900 focus:outline-none"
          >
            {materialName || "Material"}
          </h2>
          <p className="text-xs text-slate-600">
            <span className="font-medium text-slate-700">
              {row?.location?.name ?? "—"}
            </span>
            <span className="mx-1.5 text-slate-300">·</span>
            {available}
            {unit ? ` ${unit}` : ""} on hand
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <Field
            label={config.amountLabel}
            helper={
              mode === "subtract" || mode === "move"
                ? `Up to ${available}${unit ? " " + unit : ""} available`
                : undefined
            }
          >
            <div className="flex items-stretch gap-2">
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
                className={inputClass}
              />
              <span className="inline-flex items-center rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-600">
                {unit || "units"}
              </span>
            </div>
          </Field>

          {mode === "subtract" && (
            <Field label="Reason">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputClass}
              >
                {SUBTRACT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {mode === "move" && (
            <Field label="Move to">
              <select
                value={toLocationId}
                onChange={(e) => setToLocationId(e.target.value)}
                required
                className={inputClass}
              >
                <option value="">— Pick a destination —</option>
                {locations
                  .filter((l) => l.id !== row.location?.id)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                      {l.type !== "floor" ? ` · ${l.type}` : ""}
                    </option>
                  ))}
              </select>
            </Field>
          )}

          <Field label="Notes" helper="Optional — appended to the row's notes.">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. delivered by Acme Truck #12"
              className={inputClass}
            />
          </Field>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => onClose?.()}
              disabled={submitting}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60 ${config.submitBg}`}
            >
              {submitting ? "Saving…" : config.submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, helper, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
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

const MODE_CONFIG = {
  add: {
    label: "Add quantity",
    amountLabel: "Quantity to add",
    submitLabel: "Add",
    submitBg: "bg-emerald-600 hover:bg-emerald-700",
    headerBg: "bg-emerald-50 border-b border-emerald-100",
    headerLabel: "text-emerald-700",
  },
  subtract: {
    label: "Subtract quantity",
    amountLabel: "Quantity to subtract",
    submitLabel: "Subtract",
    submitBg: "bg-rose-600 hover:bg-rose-700",
    headerBg: "bg-rose-50 border-b border-rose-100",
    headerLabel: "text-rose-700",
  },
  move: {
    label: "Move material",
    amountLabel: "Quantity to move",
    submitLabel: "Move",
    submitBg: "bg-blue-600 hover:bg-blue-700",
    headerBg: "bg-blue-50 border-b border-blue-100",
    headerLabel: "text-blue-700",
  },
};
