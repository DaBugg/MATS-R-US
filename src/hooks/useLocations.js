import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

export function useLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLocations = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setError(new Error("Supabase is not configured. See .env.example."));
      return;
    }
    const { data, error: fetchError } = await supabase
      .from("locations")
      .select("*")
      .order("sort_order", { ascending: true });
    if (fetchError) {
      setError(fetchError);
    } else {
      setError(null);
      setLocations(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLocations();
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel("locations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "locations" },
        () => fetchLocations(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLocations]);

  const activeLocations = useMemo(
    () => locations.filter((l) => l.is_active),
    [locations],
  );

  const addLocation = useCallback(async ({ name, type, sort_order }) => {
    const { data, error: insertError } = await supabase
      .from("locations")
      .insert([{ name, type, sort_order, is_active: true }])
      .select()
      .single();
    if (insertError) throw insertError;
    return data;
  }, []);

  const updateLocation = useCallback(async (id, patch) => {
    const { data, error: updateError } = await supabase
      .from("locations")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (updateError) throw updateError;
    return data;
  }, []);

  const archiveLocation = useCallback(
    (id) => updateLocation(id, { is_active: false }),
    [updateLocation],
  );

  const restoreLocation = useCallback(
    (id) => updateLocation(id, { is_active: true }),
    [updateLocation],
  );

  // Returns { ok: true } if deleted, or { ok: false, reason: 'has_inventory' }
  // if the location still has inventory items (callers should archive instead).
  const deleteLocationIfEmpty = useCallback(async (id) => {
    const { count, error: countError } = await supabase
      .from("inventory_items")
      .select("id", { count: "exact", head: true })
      .eq("location_id", id);
    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      return { ok: false, reason: "has_inventory" };
    }
    const { error: deleteError } = await supabase
      .from("locations")
      .delete()
      .eq("id", id);
    if (deleteError) throw deleteError;
    return { ok: true };
  }, []);

  return {
    locations,
    activeLocations,
    loading,
    error,
    refresh: fetchLocations,
    addLocation,
    updateLocation,
    archiveLocation,
    restoreLocation,
    deleteLocationIfEmpty,
  };
}
