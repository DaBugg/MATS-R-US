import { neon } from "@neondatabase/serverless";
import { authorize, dbError, reject } from "./_auth.js";

export default async function handler(request, response) {
  if (request.method !== "GET") return reject(response, 405, "Method not allowed");
  if (authorize(request) !== "site-editor") return reject(response, 401, "Invalid editor key.");
  if (!process.env.DATABASE_URL) return reject(response, 503, "Database is not configured.");
  try {
    const sql = neon(process.env.DATABASE_URL);
    const [required, stock] = await Promise.all([
      sql`select i.material_id, m.name, i.unit, sum(i.quantity)::numeric as required,
        count(distinct t.drawing_id)::integer as plan_count
        from public.takeoff_items i
        join public.takeoffs t on t.id = i.takeoff_id
        join public.materials m on m.id = i.material_id
        where t.status = 'approved' and i.status = 'confirmed'
        group by i.material_id, m.name, i.unit order by m.name, i.unit`,
      sql`select material_id, unit, sum(quantity)::numeric as quantity
        from public.inventory_items group by material_id, unit`,
    ]);
    const rows = required.map((item) => {
      const matching = stock.filter((row) => row.material_id === item.material_id && row.unit === item.unit);
      const otherUnits = stock.filter((row) => row.material_id === item.material_id && row.unit !== item.unit && Number(row.quantity) > 0);
      const available = matching.reduce((sum, row) => sum + Number(row.quantity), 0);
      return {
        ...item,
        required: Number(item.required),
        available,
        to_order: Math.max(0, Number(item.required) - available),
        unit_mismatch: otherUnits.length > 0,
      };
    });
    response.setHeader("Cache-Control", "no-store");
    return response.status(200).json({ rows });
  } catch (error) { return dbError(response, error); }
}
