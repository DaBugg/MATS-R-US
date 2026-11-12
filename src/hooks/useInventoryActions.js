import { useCallback } from "react";
import { sharedWrite } from "../lib/demoClient.js";

export function stockChange(action, fields) {
  return sharedWrite("/api/stock", { requestId: crypto.randomUUID(), action, ...fields });
}

function positive(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Quantity must be greater than zero.");
  return amount;
}

export function useInventoryActions() {
  const addQuantity = useCallback(({ rowId, amount, notes }) =>
    stockChange("add", { rowId, amount: positive(amount), notes: notes || null }), []);
  const subtractQuantity = useCallback(({ rowId, amount, reason, notes }) =>
    stockChange("subtract", {
      rowId, amount: positive(amount),
      notes: [reason, notes].filter(Boolean).join(" — ") || null,
    }), []);
  const moveQuantity = useCallback(({ fromRowId, toLocationId, amount, notes }) =>
    stockChange("move", {
      rowId: fromRowId, targetLocationId: toLocationId,
      amount: positive(amount), notes: notes || null,
    }), []);
  return { addQuantity, subtractQuantity, moveQuantity };
}
