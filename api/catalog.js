import { neon } from "@neondatabase/serverless";
import { authorize, dbError, reject } from "./_auth.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(request, response) {
  if (request.method !== "POST") return reject(response, 405, "Method not allowed");
  if (authorize(request) !== "site-editor") return reject(response, 401, "Invalid editor key.");
  if (!process.env.DATABASE_URL) return reject(response, 503, "Database is not configured.");
  const { action, id, name, type, sort_order, is_active, default_unit, supplier_id } = request.body || {};
  if (id != null && !UUID.test(id) || supplier_id != null && !UUID.test(supplier_id)) return reject(response, 400, "Invalid ID.");
  try {
    const sql = neon(process.env.DATABASE_URL);
    let rows;
    if (action === "findOrCreateMaterial") {
      if (typeof name !== "string" || !name.trim() || name.length > 160 ||
          default_unit != null && (typeof default_unit !== "string" || default_unit.length > 40)) return reject(response, 400, "Invalid material.");
      rows = await sql`insert into public.materials (name, default_unit, supplier_id)
        values (${name.trim()}, ${default_unit || null}, ${supplier_id || null}::uuid)
        on conflict ((lower(btrim(name)))) do update set name = public.materials.name
        returning *`;
    } else if (action === "addLocation") {
      if (typeof name !== "string" || !name.trim() || name.length > 120 ||
          !["floor", "storage", "other"].includes(type) || !Number.isInteger(sort_order)) return reject(response, 400, "Invalid location.");
      rows = await sql`insert into public.locations (name, type, sort_order)
        values (${name.trim()}, ${type}, ${sort_order})
        on conflict ((lower(btrim(name)))) do nothing returning *`;
      if (!rows.length) return reject(response, 409, "A location with this name already exists.");
    } else if (action === "updateLocation") {
      if (!id || typeof name !== "string" || !name.trim() || name.length > 120 ||
          !["floor", "storage", "other"].includes(type) || !Number.isInteger(sort_order) ||
          typeof is_active !== "boolean") return reject(response, 400, "Invalid location.");
      rows = await sql`update public.locations set name = ${name.trim()}, type = ${type},
        sort_order = ${sort_order}, is_active = ${is_active}, updated_at = now()
        where id = ${id}::uuid returning *`;
    } else if (action === "archiveSiteAsset") {
      if (!id) return reject(response, 400, "Missing site asset.");
      rows = await sql`update public.locations
        set is_active = false, updated_at = now()
        where id = ${id}::uuid
          and type in ('storage', 'other')
          and is_active = true
          and not exists (
            select 1 from public.inventory_items
            where location_id = ${id}::uuid
          )
        returning *`;
      if (!rows.length) return reject(response, 409, "This site asset has inventory or is already removed.");
    } else if (action === "deleteLocation") {
      if (!id) return reject(response, 400, "Missing location.");
      rows = await sql`delete from public.locations where id = ${id}::uuid returning *`;
    } else return reject(response, 400, "Unknown catalog action.");
    if (!rows.length) return reject(response, 404, "Record not found.");
    response.setHeader("Cache-Control", "no-store");
    return response.status(200).json(rows[0]);
  } catch (error) { return dbError(response, error); }
}
