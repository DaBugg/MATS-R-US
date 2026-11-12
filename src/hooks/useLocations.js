import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { sharedWrite } from "../lib/demoClient.js";

export function useLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Per-instance channel suffix so two components calling useLocations() in
  // the same render tree don't collide on Supabase's by-name channel cache.
  const channelIdRef = useRef(null);
  if (channelIdRef.current === null) {
    channelIdRef.current = crypto.randomUUID();
  }

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
      .channel(`locations-realtime-${channelIdRef.current}`)
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
    return sharedWrite("/api/catalog", { action: "addLocation", name, type, sort_order: Number(sort_order) });
  }, []);

  const updateLocation = useCallback(async (id, patch) => {
    const { data: current, error } = await supabase.from("locations").select("*").eq("id", id).single();
    if (error) throw error;
    return sharedWrite("/api/catalog", {
      action: "updateLocation", id, ...current, ...patch,
      sort_order: Number(patch.sort_order ?? current.sort_order),
    });
  }, []);

  const archiveLocation = useCallback(
    (id) => sharedWrite("/api/catalog", { action: "archiveSiteAsset", id }),
    [],
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
    await sharedWrite("/api/catalog", { action: "deleteLocation", id });
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
