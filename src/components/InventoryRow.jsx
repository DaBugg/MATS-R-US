import { useEffect, useState } from "react";

export default function InventoryRow({ row, suppliers, onUpdate, onDelete }) {
  const [error, setError] = useState(null);
  const [savingField, setSavingField] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const persist = async (field, value) => {
    setError(null);
    setSavingField(field);
    try {
      await onUpdate({ [field]: value });
    } catch (err) {
      setError(err?.message ?? "Save failed.");
    } finally {
      setSavingField(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${row.material?.name}" from this location?`)) {
      return;
    }
    setError(null);
    setDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err?.message ?? "Delete failed.");
      setDeleting(false);
    }
  };

  return (
    <tr className={deleting ? "opacity-50" : undefined}>
      <td className="whitespace-nowrap px-4 py-2 align-middle text-sm font-medium text-slate-900">
        {row.material?.name ?? "—"}
        {row.material?.default_unit && (
          <span className="ml-2 text-xs font-normal text-slate-400">
            (default: {row.material.default_unit})
          </span>
        )}
      </td>

      <td className="px-2 py-1 align-middle">
        <NumberCell
          value={row.quantity}
          saving={savingField === "quantity"}
          onCommit={(value) => persist("quantity", value)}
        />
      </td>

      <td className="px-2 py-1 align-middle">
        <TextCell
          value={row.unit ?? ""}
          placeholder="—"
          saving={savingField === "unit"}
          onCommit={(value) => persist("unit", value || null)}
        />
      </td>

      <td className="px-2 py-1 align-middle">
        <SupplierCell
          value={row.supplier?.id ?? ""}
          suppliers={suppliers}
          saving={savingField === "supplier_id"}
          onCommit={(value) => persist("supplier_id", value || null)}
        />
      </td>

      <td className="px-2 py-1 align-middle">
        <TextCell
          value={row.notes ?? ""}
          placeholder="—"
          saving={savingField === "notes"}
          onCommit={(value) => persist("notes", value || null)}
        />
      </td>

      <td className="px-4 py-2 align-middle text-right">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
        {error && (
          <div className="mt-1 text-xs text-rose-700" role="alert">
            {error}
          </div>
        )}
      </td>
    </tr>
  );
}

function NumberCell({ value, saving, onCommit }) {
  const [local, setLocal] = useState(value ?? 0);

  useEffect(() => {
    setLocal(value ?? 0);
  }, [value]);

  const commit = () => {
    const num = Number(local);
    if (!Number.isFinite(num) || num < 0) {
      setLocal(value ?? 0);
      return;
    }
    if (num === Number(value)) return;
    onCommit(num);
  };

  return (
    <div className="relative">
      <input
        type="number"
        step="0.01"
        min="0"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className="w-24 rounded border border-slate-200 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
      />
      {saving && <SavingDot />}
    </div>
  );
}

function TextCell({ value, placeholder, saving, onCommit }) {
  const [local, setLocal] = useState(value ?? "");

  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  const commit = () => {
    const trimmed = local.trim();
    if (trimmed === (value ?? "").trim()) return;
    onCommit(trimmed);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className="w-full min-w-32 rounded border border-slate-200 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
      />
      {saving && <SavingDot />}
    </div>
  );
}

function SupplierCell({ value, suppliers, saving, onCommit }) {
  const [local, setLocal] = useState(value ?? "");

  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  return (
    <div className="relative">
      <select
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          onCommit(e.target.value);
        }}
        className="w-full min-w-32 rounded border border-slate-200 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
      >
        <option value="">— None —</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {saving && <SavingDot />}
    </div>
  );
}

function SavingDot() {
  return (
    <span
      aria-label="Saving"
      title="Saving..."
      className="absolute -right-3 top-1/2 h-2 w-2 -translate-y-1/2 animate-pulse rounded-full bg-blue-500"
    />
  );
}
