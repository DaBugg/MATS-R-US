import { neon } from "@neondatabase/serverless";
import { authorize, dbError, reject } from "./_auth.js";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
export default async function handler(req, res) {
  if (authorize(req) !== "site-editor") return reject(res, 401, "Invalid editor key.");
  if (!process.env.DATABASE_URL) return reject(res, 503, "Database is not configured.");
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === "GET") {
      const [orders, lines, receipts] = await Promise.all([
        sql`select * from public.purchase_orders order by created_at desc`,
        sql`select l.*, m.name, coalesce(sum(r.quantity),0)::numeric as received from public.purchase_order_lines l join public.materials m on m.id=l.material_id left join public.purchase_order_receipts r on r.line_id=l.id group by l.id,m.name order by m.name`,
        sql`select * from public.purchase_order_receipts order by created_at desc`,
      ]);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ orders, lines, receipts });
    }
    if (req.method !== "POST") return reject(res, 405, "Method not allowed");
    const b = req.body || {};
    if (b.action === "create") {
      if (!UUID.test(b.id || "") || !text(b.number,80) || !text(b.supplier,180) ||
        (b.expectedDate && (!/^\d{4}-\d{2}-\d{2}$/.test(b.expectedDate) || Number.isNaN(Date.parse(b.expectedDate)))) ||
        !Array.isArray(b.lines) || b.lines.length < 1 || b.lines.length > 200 ||
        b.lines.some(l => !UUID.test(l.materialId || "") || !text(l.unit,40) || typeof l.quantity !== "number" || !Number.isFinite(l.quantity) || l.quantity <= 0 || l.quantity > 9999999999 || Math.abs(l.quantity*100-Math.round(l.quantity*100))>1e-6) ||
        new Set(b.lines.map(l=>`${l.materialId}:${l.unit.trim()}`)).size !== b.lines.length) return reject(res,400,"Enter valid PO details and quantities.");
      // A single statement creates the header and immutable quantity snapshot.
      // Duplicate IDs fail safely instead of creating duplicate orders on retry.
      await sql`with po as (insert into public.purchase_orders(id,number,supplier,expected_date) values(${b.id}::uuid,${b.number.trim()},${b.supplier.trim()},${b.expectedDate || null}::date) returning id)
        insert into public.purchase_order_lines(purchase_order_id,material_id,unit,quantity)
        select po.id, (l->>'materialId')::uuid, trim(l->>'unit'), (l->>'quantity')::numeric from po cross join jsonb_array_elements(${JSON.stringify(b.lines)}::jsonb) l`;
    } else if (b.action === "status") {
      if (!UUID.test(b.id || "") || !["ordered","cancelled"].includes(b.status)) return reject(res,400,"Invalid PO status.");
      await sql`select public.set_po_status(${b.id}::uuid,${b.status})`;
    } else if (b.action === "receipt") {
      if (!UUID.test(b.id || "") || !UUID.test(b.lineId || "") || typeof b.quantity !== "number" || !Number.isFinite(b.quantity) || b.quantity<=0 || Math.abs(b.quantity*100-Math.round(b.quantity*100))>1e-6) return reject(res,400,"Invalid delivery quantity.");
      await sql`select public.record_po_receipt(${b.id}::uuid,${b.lineId}::uuid,${b.quantity}::numeric)`;
    } else return reject(res,400,"Unknown PO action.");
    res.setHeader("Cache-Control","no-store");
    return res.status(200).json({ saved: true });
  } catch (e) { return dbError(res,e); }
}
