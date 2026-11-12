import { neon } from "@neondatabase/serverless";
import { authorize, dbError, reject } from "./_auth.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "add", "subtract", "move", "set", "delete"]);
const validId = (value) => value == null || UUID.test(value);

export default async function handler(request, response) {
  if (request.method !== "POST") return reject(response, 405, "Method not allowed");
  const actor = authorize(request);
  if (!actor) return reject(response, 401, "Invalid editor key.");
  if (!process.env.DATABASE_URL) return reject(response, 503, "Database is not configured.");
  const body = request.body || {};
  const { requestId, action, rowId, targetLocationId, materialId, locationId, supplierId, amount, unit, notes } = body;
  if (actor === "dot" && !["add", "subtract", "move"].includes(action)) {
    return reject(response, 403, "Dot may only add, subtract, or move stock.");
  }
  if (!UUID.test(requestId || "") || !ACTIONS.has(action) ||
      ![rowId, targetLocationId, materialId, locationId, supplierId].every(validId) ||
      (amount != null && (!Number.isFinite(Number(amount)) || Number(amount) < 0 || Number(amount) > 9999999999)) ||
      (unit != null && (typeof unit !== "string" || unit.length > 40)) ||
      (notes != null && (typeof notes !== "string" || notes.length > 500))) {
    return reject(response, 400, "Invalid stock change.");
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`select public.apply_inventory_change(
      ${requestId}::uuid, ${action}, ${rowId || null}::uuid,
      ${targetLocationId || null}::uuid, ${materialId || null}::uuid,
      ${locationId || null}::uuid, ${amount == null ? null : Number(amount)}::numeric,
      ${unit ?? null}, ${supplierId || null}::uuid, ${notes ?? null}, ${actor}
    ) as result`;
    response.setHeader("Cache-Control", "no-store");
    return response.status(200).json(result[0].result);
  } catch (error) { return dbError(response, error); }
}
