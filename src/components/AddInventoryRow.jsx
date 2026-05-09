import { useId, useState } from "react";

const INITIAL_FORM = {
  materialName: "",
  quantity: "",
  unit: "",
  supplier_id: "",
  notes: "",
};

export default function AddInventoryRow({
  materials,
  suppliers,
  onSubmit,
  onCancel,
}) {
  const datalistId = useId();
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const setField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleMaterialChange = (event) => {
    const value = event.target.value;
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

    const materialName = form.materialName.trim();
    if (!materialName) {
      setError("Material name is required.");
      return;
    }

    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      setError("Quantity must be a non-negative number.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        materialName,
        quantity,
        unit: form.unit.trim() || null,
        supplier_id: form.supplier_id || null,
        notes: form.notes.trim() || null,
      });
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err?.message ?? "Failed to add inventory.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-4">
          <Label htmlFor="add-material">Material</Label>
          <input
            id="add-material"
            list={datalistId}
            value={form.materialName}
            onChange={handleMaterialChange}
            placeholder='e.g. 1 1/2 inch PVC Pipe'
            required
            autoFocus
            className={inputClass}
          />
          <datalist id={datalistId}>
            {materials.map((m) => (
              <option key={m.id} value={m.name} />
            ))}
          </datalist>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="add-quantity">Quantity</Label>
          <input
            id="add-quantity"
            type="number"
            step="0.01"
            min="0"
            value={form.quantity}
            onChange={setField("quantity")}
            placeholder="0"
            required
            className={inputClass}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="add-unit">Unit</Label>
          <input
            id="add-unit"
            value={form.unit}
            onChange={setField("unit")}
            placeholder="pcs, ft, box..."
            className={inputClass}
          />
        </div>

        <div className="md:col-span-4">
          <Label htmlFor="add-supplier">Supplier</Label>
          <select
            id="add-supplier"
            value={form.supplier_id}
            onChange={setField("supplier_id")}
            className={inputClass}
          >
            <option value="">— Select supplier —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="add-notes">Notes (optional)</Label>
        <input
          id="add-notes"
          value={form.notes}
          onChange={setField("notes")}
          placeholder="Anything worth remembering..."
          className={inputClass}
        />
      </div>

      {error && (
        <p className="text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Adding..." : "Add Inventory"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

function Label({ htmlFor, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600"
    >
      {children}
    </label>
  );
}
