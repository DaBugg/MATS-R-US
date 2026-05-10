import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECT_GRAPH = `
  id,
  material_id,
  location_id,
  quantity,
  unit,
  notes,
  supplier_id,
  created_at,
  updated_at,
  material:materials ( id, name, default_unit ),
  location:locations ( id, name, type ),
  supplier:suppliers ( id, name )
`;

function asNumber(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`${label} must be a number.`);
  }
  return n;
}

function appendNote(existing, fragment) {
  if (!fragment) return existing ?? null;
  if (!existing) return fragment;
  return `${existing}\n${fragment}`;
}

// Hook exposing the three operational actions (add / subtract / move) and a
// few helpers. All ops run against the existing inventory_items table — no
// transaction log is written today (see TODO_DATABASE_MIGRATION.md). Realtime
// subscriptions in useInventory / useAllInventory / useInventoryStats will
// pick up the resulting row changes automatically.
export function useInventoryActions() {
  // Add quantity to an existing inventory_items row.
  const addQuantity = useCallback(async ({ rowId, amount, notes }) => {
    if (!rowId) throw new Error("Missing inventory row.");
    const delta = asNumber(amount, "Quantity to add");
    if (delta <= 0) throw new Error("Quantity to add must be greater than 0.");

    const { data: current, error: fetchErr } = await supabase
      .from("inventory_items")
      .select("quantity, notes")
      .eq("id", rowId)
      .single();
    if (fetchErr) throw fetchErr;

    const next = Number(current.quantity ?? 0) + delta;
    const { data, error } = await supabase
      .from("inventory_items")
      .update({
        quantity: next,
        notes: notes
          ? appendNote(current.notes, `+${delta} ${truncate(notes, 80)}`)
          : current.notes,
      })
      .eq("id", rowId)
      .select(SELECT_GRAPH)
      .single();
    if (error) throw error;
    return data;
  }, []);

  // Subtract quantity from an existing inventory_items row. Refuses to go
  // negative.
  const subtractQuantity = useCallback(
    async ({ rowId, amount, reason, notes }) => {
      if (!rowId) throw new Error("Missing inventory row.");
      const delta = asNumber(amount, "Quantity to subtract");
      if (delta <= 0)
        throw new Error("Quantity to subtract must be greater than 0.");

      const { data: current, error: fetchErr } = await supabase
        .from("inventory_items")
        .select("quantity, notes")
        .eq("id", rowId)
        .single();
      if (fetchErr) throw fetchErr;

      const available = Number(current.quantity ?? 0);
      if (delta > available) {
        throw new Error(
          `Only ${available} available — can't subtract ${delta}.`,
        );
      }
      const next = available - delta;

      const noteFragment = [
        `-${delta}`,
        reason ? `(${reason})` : "",
        notes ? truncate(notes, 80) : "",
      ]
        .filter(Boolean)
        .join(" ");

      const { data, error } = await supabase
        .from("inventory_items")
        .update({
          quantity: next,
          notes: appendNote(current.notes, noteFragment),
        })
        .eq("id", rowId)
        .select(SELECT_GRAPH)
        .single();
      if (error) throw error;
      return data;
    },
    [],
  );

  // Move quantity from a source inventory_items row to a target location.
  // - If the target location already has a row for the same material, that
  //   row's quantity is incremented.
  // - Otherwise, a new row is inserted at the target.
  // - The source row is decremented; never goes negative.
  // - If the source row hits zero and was a "TBD" placeholder it is left in
  //   place so the operator still sees the line; otherwise it is kept too
  //   (no auto-delete) so the move is reversible.
  const moveQuantity = useCallback(
    async ({ fromRowId, toLocationId, amount, notes }) => {
      if (!fromRowId) throw new Error("Missing source inventory row.");
      if (!toLocationId) throw new Error("Pick a destination location.");
      const delta = asNumber(amount, "Quantity to move");
      if (delta <= 0) throw new Error("Quantity to move must be greater than 0.");

      // Source row.
      const { data: source, error: srcErr } = await supabase
        .from("inventory_items")
        .select(
          "id, material_id, location_id, quantity, unit, supplier_id, notes",
        )
        .eq("id", fromRowId)
        .single();
      if (srcErr) throw srcErr;

      const available = Number(source.quantity ?? 0);
      if (delta > available) {
        throw new Error(
          `Only ${available} available at source — can't move ${delta}.`,
        );
      }
      if (source.location_id === toLocationId) {
        throw new Error("Source and destination locations are the same.");
      }

      // Look for an existing target row with same material_id at toLocationId.
      const { data: existingTarget, error: tgtErr } = await supabase
        .from("inventory_items")
        .select("id, quantity, notes")
        .eq("material_id", source.material_id)
        .eq("location_id", toLocationId)
        .maybeSingle();
      if (tgtErr) throw tgtErr;

      const moveNote = `→ moved ${delta}${notes ? " " + truncate(notes, 80) : ""}`;
      const arriveNote = `← received ${delta}${notes ? " " + truncate(notes, 80) : ""}`;

      // 1. Decrement source.
      const { error: decErr } = await supabase
        .from("inventory_items")
        .update({
          quantity: available - delta,
          notes: appendNote(source.notes, moveNote),
        })
        .eq("id", source.id);
      if (decErr) throw decErr;

      // 2. Apply to target (update or insert).
      if (existingTarget) {
        const { error: upErr } = await supabase
          .from("inventory_items")
          .update({
            quantity: Number(existingTarget.quantity ?? 0) + delta,
            notes: appendNote(existingTarget.notes, arriveNote),
          })
          .eq("id", existingTarget.id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase
          .from("inventory_items")
          .insert([
            {
              material_id: source.material_id,
              location_id: toLocationId,
              quantity: delta,
              unit: source.unit,
              supplier_id: source.supplier_id,
              notes: arriveNote,
            },
          ]);
        if (insErr) throw insErr;
      }
      return { delta };
    },
    [],
  );

  return { addQuantity, subtractQuantity, moveQuantity };
}

function truncate(s, max) {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
