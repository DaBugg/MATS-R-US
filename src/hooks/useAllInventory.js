import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const SELECT_GRAPH = `
  id,
  quantity,
  unit,
  notes,
  created_at,
  updated_at,
  material:materials ( id, name, default_unit ),
  location:locations ( id, name, type, sort_order, is_active ),
  supplier:suppliers ( id, name )
`;

// Fetches every inventory_item row across all locations. Used by the global
// Inventory page and Dashboard widgets. Realtime-subscribed.
export function useAllInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Per-instance channel suffix — see useLocations.js.
  const channelIdRef = useRef(null);
  if (channelIdRef.current === null) {
    channelIdRef.current = crypto.randomUUID();
  }

  const fetchItems = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from("inventory_items")
      .select(SELECT_GRAPH)
      .order("updated_at", { ascending: false });
    if (fetchError) {
      setError(fetchError);
    } else {
      setError(null);
      setItems(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel(`all-inventory-realtime-${channelIdRef.current}`)
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "locations" },
        () => fetchItems(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  return { items, loading, error, refresh: fetchItems };
}
