import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

export function useMaterials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMaterials = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from("materials")
      .select("id, name, default_unit, supplier_id, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (fetchError) {
      setError(fetchError);
    } else {
      setError(null);
      setMaterials(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMaterials();
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel("materials-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "materials" },
        () => fetchMaterials(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMaterials]);

  // Find an existing material by exact name (case-insensitive trim) or insert one.
  // Returns the materials row.
  const findOrCreateMaterial = useCallback(
    async ({ name, default_unit, supplier_id }) => {
      const trimmed = (name ?? "").trim();
      if (!trimmed) throw new Error("Material name is required.");

      const { data: existing, error: findError } = await supabase
        .from("materials")
        .select("id, name, default_unit, supplier_id, is_active")
        .ilike("name", trimmed)
        .limit(1)
        .maybeSingle();
      if (findError) throw findError;
      if (existing) return existing;

      const { data: inserted, error: insertError } = await supabase
        .from("materials")
        .insert([
          {
            name: trimmed,
            default_unit: default_unit || null,
            supplier_id: supplier_id || null,
          },
        ])
        .select()
        .single();
      if (insertError) throw insertError;
      return inserted;
    },
    [],
  );

  return { materials, loading, error, refresh: fetchMaterials, findOrCreateMaterial };
}
