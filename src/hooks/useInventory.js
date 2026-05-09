import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

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
      .channel(`inventory-realtime-${locationId}`)
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
      const { data, error: insertError } = await supabase
        .from("inventory_items")
        .insert([
          {
            material_id,
            location_id: locationId,
            quantity,
            unit: unit || null,
            supplier_id: supplier_id || null,
            notes: notes || null,
          },
        ])
        .select(SELECT_GRAPH)
        .single();
      if (insertError) throw insertError;
      return data;
    },
    [locationId],
  );

  const updateInventoryItem = useCallback(async (id, patch) => {
    const { data, error: updateError } = await supabase
      .from("inventory_items")
      .update(patch)
      .eq("id", id)
      .select(SELECT_GRAPH)
      .single();
    if (updateError) throw updateError;
    return data;
  }, []);

  const deleteInventoryItem = useCallback(async (id) => {
    const { error: deleteError } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", id);
    if (deleteError) throw deleteError;
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
