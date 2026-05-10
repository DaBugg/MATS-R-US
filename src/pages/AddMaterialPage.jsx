import { useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLocations } from "../hooks/useLocations.js";
import { useMaterials } from "../hooks/useMaterials.js";
import { useSuppliers } from "../hooks/useSuppliers.js";
import { useInventory } from "../hooks/useInventory.js";

const COMMON_UNITS = [
  "pcs",
  "ft",
  "ft²",
  "yd³",
  "box",
  "bundle",
  "sheet",
  "roll",
  "gal",
  "jar",
  "each",
];

const INITIAL = {
  materialName: "",
  location_id: "",
  quantity: "",
  unit: "",
  supplier_id: "",
  notes: "",
};

export default function AddMaterialPage() {
  const navigate = useNavigate();
  const datalistId = useId();
  const unitListId = useId();

  const { activeLocations, loading: locLoading } = useLocations();
  const { materials, findOrCreateMaterial } = useMaterials();
  const { suppliers } = useSuppliers();

  const [form, setForm] = useState(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // We use useInventory bound to whichever location was selected, so that
  // addInventoryItem inserts to the right location.
  const { addInventoryItem } = useInventory(form.location_id || null);

  const setField = (k) => (e) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleMaterialChange = (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const match = materials.find(
        (m) => m.name.toLowerCase() === value.trim().toLowerCase(),
      );
      return {
        ...prev,
        materialName: value,
        unit: prev.unit || match?.default_unit || "",
        supplier_id: prev.supplier_id || match?.supplier_id || "",
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const materialName = form.materialName.trim();
    if (!materialName) return setError("Material name is required.");
    if (!form.location_id) return setError("Pick a location.");
    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      return setError("Quantity must be a non-negative number.");
    }

    setSubmitting(true);
    try {
      const material = await findOrCreateMaterial({
        name: materialName,
        default_unit: form.unit || null,
        supplier_id: form.supplier_id || null,
      });
      await addInventoryItem({
        material_id: material.id,
        quantity,
        unit: form.unit.trim() || null,
        supplier_id: form.supplier_id || null,
        notes: form.notes.trim() || null,
      });
      setSuccess(
        `Added ${quantity}${form.unit ? " " + form.unit : ""} of "${materialName}".`,
      );
      // Keep the location/supplier selections; reset just the material/qty.
      setForm((prev) => ({
        ...prev,
        materialName: "",
        quantity: "",
        notes: "",
      }));
    } catch (err) {
      setError(err?.message ?? "Failed to add material.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Add Material
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Quick entry for material that just arrived or was found on a floor.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Material" required helper="Type to search existing materials, or enter a new name to create one.">
            <input
              list={datalistId}
              value={form.materialName}
              onChange={handleMaterialChange}
              placeholder="e.g. 1 1/2 inch PVC Pipe"
              required
              autoFocus
              className={inputClass}
            />
            <datalist id={datalistId}>
              {materials.map((m) => (
                <option key={m.id} value={m.name} />
              ))}
            </datalist>
          </Field>

          <Field
            label="Location"
            required
            helper="Where is this material currently stored? Floor, Connex, or staging area."
          >
            <select
              value={form.location_id}
              onChange={setField("location_id")}
              required
              disabled={locLoading}
              className={inputClass}
            >
              <option value="">— Select location —</option>
              {activeLocations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.type !== "floor" ? `· ${l.type}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Quantity" required>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.quantity}
              onChange={setField("quantity")}
              placeholder="0"
              required
              className={inputClass}
            />
          </Field>

          <Field label="Unit">
            <input
              list={unitListId}
              value={form.unit}
              onChange={setField("unit")}
              placeholder="pcs, ft, box…"
              className={inputClass}
            />
            <datalist id={unitListId}>
              {COMMON_UNITS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </Field>

          <Field label="Supplier" helper="Optional — pulls from the suppliers table.">
            <select
              value={form.supplier_id}
              onChange={setField("supplier_id")}
              className={inputClass}
            >
              <option value="">— None —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Notes" helper="Anything worth remembering — damage, who delivered it, etc.">
            <input
              value={form.notes}
              onChange={setField("notes")}
              placeholder="Optional"
              className={inputClass}
            />
          </Field>
        </div>

        {error && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {success}{" "}
            <Link to="/inventory" className="underline hover:no-underline">
              View inventory
            </Link>
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={submitting}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save Material"}
          </button>
        </div>
      </form>

      <p className="text-xs text-slate-500">
        Tip: include fractional sizes naturally in the material name —{" "}
        <code className="rounded bg-slate-100 px-1">1 1/2 inch PVC Pipe</code>,{" "}
        <code className="rounded bg-slate-100 px-1">3/4 in. Copper Tee</code>.
      </p>
    </div>
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
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-500";
