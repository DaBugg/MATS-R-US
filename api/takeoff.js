import { neon } from "@neondatabase/serverless";
import { authorize, dbError, reject } from "./_auth.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validId = (value) => value == null || UUID.test(value);

export default async function handler(request, response) {
  if (authorize(request) !== "site-editor") return reject(response, 401, "Invalid editor key.");
  if (!process.env.DATABASE_URL) return reject(response, 503, "Database is not configured.");
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (request.method === "GET") {
      const drawingId = request.query.drawingId;
      if (!UUID.test(drawingId || "")) return reject(response, 400, "Invalid plan ID.");
      const takeoffs = await sql`select * from public.takeoffs where drawing_id = ${drawingId}::uuid`;
      if (!takeoffs.length) return reject(response, 404, "Takeoff not found.");
      const items = await sql`select * from public.takeoff_items where takeoff_id = ${takeoffs[0].id} order by page_number, created_at`;
      response.setHeader("Cache-Control", "no-store");
      return response.status(200).json({ takeoff: takeoffs[0], items });
    }
    if (request.method !== "POST") return reject(response, 405, "Method not allowed");
    const body = request.body || {};
    const { action, drawingId } = body;
    if (!UUID.test(drawingId || "")) return reject(response, 400, "Invalid plan ID.");
    const takeoffs = await sql`select * from public.takeoffs where drawing_id = ${drawingId}::uuid`;
    if (!takeoffs.length) return reject(response, 404, "Takeoff not found.");
    const takeoffId = takeoffs[0].id;
    if (action === "saveItem") {
      const { id, clientId, materialId, description, quantity, unit, pageNumber, x, y, evidence, status } = body;
      const n = Number(quantity);
      if (!validId(id) || (!id && !UUID.test(clientId || "")) || !validId(materialId) || typeof description !== "string" ||
          !description.trim() || description.length > 180 || !Number.isFinite(n) || n <= 0 ||
          n > 9999999999 || Math.abs(n * 100 - Math.round(n * 100)) > 1e-6 || typeof unit !== "string" ||
          !unit.trim() || unit.length > 40 || !Number.isInteger(pageNumber) || pageNumber < 1 ||
          pageNumber > 200 || (x != null && (!Number.isFinite(Number(x)) || x < 0 || x > 1)) ||
          (y != null && (!Number.isFinite(Number(y)) || y < 0 || y > 1)) ||
          typeof evidence !== "string" || evidence.length > 500 ||
          !["review", "confirmed", "rejected"].includes(status) ||
          (status === "confirmed" && !materialId)) return reject(response, 400, "Invalid material item.");
      const drawing = await sql`select page_count from public.drawings where id = ${drawingId}::uuid`;
      if (pageNumber > drawing[0].page_count) return reject(response, 400, "Page is outside this plan.");
      if (materialId) {
        const material = await sql`select id from public.materials where id = ${materialId}::uuid`;
        if (!material.length) return reject(response, 400, "Material not found.");
      }
      const rows = id
        ? await sql`with changed as (
            update public.takeoff_items set material_id = ${materialId || null}::uuid,
              description = ${description.trim()}, quantity = ${n}, unit = ${unit.trim()},
              page_number = ${pageNumber}, x = ${x ?? null}, y = ${y ?? null},
              evidence = ${evidence.trim()}, status = ${status}, updated_at = now()
              where id = ${id}::uuid and takeoff_id = ${takeoffId}::uuid returning *
          ), reset as (
            update public.takeoffs set status = 'draft', approved_at = null, updated_at = now()
            where id = ${takeoffId}::uuid and exists (select 1 from changed) returning id
          ) select changed.* from changed join reset on true`
        : await sql`with changed as (
            insert into public.takeoff_items
              (id, takeoff_id, material_id, description, quantity, unit, page_number, x, y, evidence, status)
              values (${clientId}::uuid, ${takeoffId}::uuid, ${materialId || null}::uuid, ${description.trim()},
              ${n}, ${unit.trim()}, ${pageNumber}, ${x ?? null}, ${y ?? null}, ${evidence.trim()}, ${status})
              on conflict (id) do update set material_id = excluded.material_id,
                description = excluded.description, quantity = excluded.quantity, unit = excluded.unit,
                page_number = excluded.page_number, x = excluded.x, y = excluded.y,
                evidence = excluded.evidence, status = excluded.status, updated_at = now()
              where public.takeoff_items.takeoff_id = excluded.takeoff_id returning *
          ), reset as (
            update public.takeoffs set status = 'draft', approved_at = null, updated_at = now()
            where id = ${takeoffId}::uuid and exists (select 1 from changed) returning id
          ) select changed.* from changed join reset on true`;
      if (!rows.length) return reject(response, 404, "Item not found.");
      return response.status(200).json({ item: rows[0] });
    }
    if (action === "deleteItem") {
      if (!UUID.test(body.id || "")) return reject(response, 400, "Invalid item ID.");
      const rows = await sql`with removed as (
          delete from public.takeoff_items where id = ${body.id}::uuid and takeoff_id = ${takeoffId}::uuid returning id
        ), reset as (
          update public.takeoffs set status = 'draft', approved_at = null, updated_at = now()
          where id = ${takeoffId}::uuid and exists (select 1 from removed) returning id
        ) select removed.id from removed join reset on true`;
      if (!rows.length) return reject(response, 404, "Item not found.");
      return response.status(200).json({ deleted: rows[0].id });
    }
    if (action === "approve") {
      const rows = await sql`update public.takeoffs set status = 'approved', approved_at = now(), updated_at = now()
        where id = ${takeoffId}::uuid
          and exists (select 1 from public.takeoff_items where takeoff_id = ${takeoffId}::uuid and status = 'confirmed')
          and not exists (select 1 from public.takeoff_items where takeoff_id = ${takeoffId}::uuid
            and (status = 'review' or (status = 'confirmed' and material_id is null))) returning *`;
      if (!rows.length) return reject(response, 409, "Confirm and match every kept item before approval.");
      return response.status(200).json({ takeoff: rows[0] });
    }
    return reject(response, 400, "Unknown takeoff action.");
  } catch (error) { return dbError(response, error); }
}
