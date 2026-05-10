import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Per-instance channel suffix — see useLocations.js.
  const channelIdRef = useRef(null);
  if (channelIdRef.current === null) {
    channelIdRef.current = crypto.randomUUID();
  }

  const fetchSuppliers = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from("suppliers")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (fetchError) {
      setError(fetchError);
    } else {
      setError(null);
      setSuppliers(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSuppliers();
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel(`suppliers-realtime-${channelIdRef.current}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suppliers" },
        () => fetchSuppliers(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSuppliers]);

  return { suppliers, loading, error, refresh: fetchSuppliers };
}
