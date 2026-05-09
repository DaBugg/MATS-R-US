import { useMemo, useState } from "react";
import { useInventory } from "../hooks/useInventory.js";
import { useMaterials } from "../hooks/useMaterials.js";
import { useSuppliers } from "../hooks/useSuppliers.js";
import AddInventoryRow from "./AddInventoryRow.jsx";
import InventoryRow from "./InventoryRow.jsx";
import SearchInput from "./SearchInput.jsx";

export default function InventoryPanel({ selectedLocation }) {
  const locationId = selectedLocation?.id ?? null;

  const {
    items,
    loading: inventoryLoading,
    error: inventoryError,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  } = useInventory(locationId);

  const {
    materials,
    findOrCreateMaterial,
  } = useMaterials();

  const { suppliers } = useSuppliers();

  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const haystack = [
        row.material?.name,
        row.supplier?.name,
        row.unit,
        row.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  if (!selectedLocation) {
    return (
      <EmptyShell title="No location selected">
        Select a floor or storage location to view inventory.
      </EmptyShell>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {selectedLocation.name}
            </h2>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {selectedLocation.type}
              {typeof items.length === "number" &&
                ` — ${items.length} ${items.length === 1 ? "item" : "items"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAdding((open) => !open)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            {adding ? "Cancel" : "+ Add Inventory"}
          </button>
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search this location (${selectedLocation.name})...`}
        />
      </div>

      {adding && (
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <AddInventoryRow
            materials={materials}
            suppliers={suppliers}
            onSubmit={async (form) => {
              const material = await findOrCreateMaterial({
                name: form.materialName,
                default_unit: form.unit,
                supplier_id: form.supplier_id,
              });
              await addInventoryItem({
                material_id: material.id,
                quantity: form.quantity,
                unit: form.unit,
                supplier_id: form.supplier_id,
                notes: form.notes,
              });
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {inventoryError && (
        <div className="m-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          Failed to load inventory: {inventoryError.message}
        </div>
      )}

      <div className="flex-1 overflow-x-auto">
        {inventoryLoading && items.length === 0 ? (
          <LoadingState />
        ) : filteredItems.length === 0 ? (
          items.length === 0 ? (
            <EmptyState
              title="No inventory logged for this location yet."
              hint='Click "Add Inventory" to start tracking material here.'
            />
          ) : (
            <EmptyState
              title="No matching material found in this location."
              hint={`No results for "${search}".`}
            />
          )
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Material</th>
                <th className="px-4 py-2 font-medium">Quantity</th>
                <th className="px-4 py-2 font-medium">Unit</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Notes</th>
                <th className="px-4 py-2 font-medium" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((row) => (
                <InventoryRow
                  key={row.id}
                  row={row}
                  suppliers={suppliers}
                  onUpdate={(patch) => updateInventoryItem(row.id, patch)}
                  onDelete={() => deleteInventoryItem(row.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function EmptyShell({ title, children }) {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-8 text-center">
      <h2 className="mb-1 text-lg font-semibold text-slate-700">{title}</h2>
      <p className="text-sm text-slate-500">{children}</p>
    </div>
  );
}

function EmptyState({ title, hint }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-slate-100" />
      ))}
    </div>
  );
}
