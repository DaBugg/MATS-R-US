import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { stockChange } from "./useInventoryActions.js";

const SELECT_GRAPH = `
  id,
  quantity,
  unit,
  notes,
  created_at,
  updated_at,
  material:materials ( id, name, default_unit ),
  location:locations ( id, name, type ),
  supplier:suppliers ( id, name )
`;

// Fetches inventory rows for a single location and keeps them fresh via
// realtime subscriptions on inventory_items, materials, and suppliers.
export function useInventory(locationId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Per-instance channel suffix — see useLocations.js. Two components viewing
  // the same locationId would otherwise collide on the named channel.
  const channelIdRef = useRef(null);
  if (channelIdRef.current === null) {
    channelIdRef.current = crypto.randomUUID();
  }

  const fetchItems = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    if (!locationId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("inventory_items")
      .select(SELECT_GRAPH)
      .eq("location_id", locationId)
      .order("updated_at", { ascending: false });
    if (fetchError) {
      setError(fetchError);
    } else {
      setError(null);
      setItems(data ?? []);
    }
    setLoading(false);
  }, [locationId]);

  useEffect(() => {
    fetchItems();
    if (!isSupabaseConfigured || !locationId) return;

    const channel = supabase
      .channel(`inventory-realtime-${locationId}-${channelIdRef.current}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items" },
        () => fetchItems(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "materials" },
        () => fetchItems(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suppliers" },
        () => fetchItems(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems, locationId]);

  const addInventoryItem = useCallback(
    async ({ material_id, quantity, unit, supplier_id, notes }) => {
      if (!locationId) throw new Error("No location selected.");
      return stockChange("create", {
        materialId: material_id, locationId, amount: Number(quantity),
        unit: unit || null, supplierId: supplier_id || null, notes: notes || null,
      });
    },
    [locationId],
  );

  const updateInventoryItem = useCallback(async (id, patch) => {
    return stockChange("set", {
      rowId: id, amount: Number(patch.quantity), notes: patch.notes ?? null,
      unit: patch.unit ?? null, supplierId: patch.supplier_id ?? null,
    });
  }, []);

  const deleteInventoryItem = useCallback(async (id) => {
    await stockChange("delete", { rowId: id });
  }, []);

  return {
    items,
    loading,
    error,
    refresh: fetchItems,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  };
}
