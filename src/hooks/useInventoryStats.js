import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

// Lightweight aggregation hook: returns a Map<location_id, { lineCount, unitTotal }>
// Refreshes whenever any inventory_items row changes (insert/update/delete).
// Used by the building visualization to show "N lines / M units" per floor.
export function useInventoryStats() {
  const [statsByLocation, setStatsByLocation] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from("inventory_items")
      .select("location_id, quantity");
    if (fetchError) {
      setError(fetchError);
      setLoading(false);
      return;
    }
    const map = new Map();
    for (const row of data ?? []) {
      const current =
        map.get(row.location_id) ?? { lineCount: 0, unitTotal: 0 };
      current.lineCount += 1;
      current.unitTotal += Number(row.quantity ?? 0);
      map.set(row.location_id, current);
    }
    setStatsByLocation(map);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel("inventory-stats-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items" },
        () => fetchStats(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  return { statsByLocation, loading, error, refresh: fetchStats };
}
