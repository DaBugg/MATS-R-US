import { neon } from "@neondatabase/serverless";
import { head } from "@vercel/blob";
import { authorize, dbError, reject } from "./_auth.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLAN_PATH = /^plans\/[0-9a-f-]{36}\/[a-zA-Z0-9._-]{1,120}\.pdf$/i;

export default async function handler(request, response) {
  if (authorize(request) !== "site-editor") return reject(response, 401, "Invalid editor key.");
  if (!process.env.DATABASE_URL) return reject(response, 503, "Database is not configured.");
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (request.method === "GET") {
      const id = request.query.id;
      const drawings = id
        ? UUID.test(id) ? await sql`select * from public.drawings where id = ${id}::uuid` : []
        : await sql`select * from public.drawings order by created_at desc`;
      if (id && !drawings.length) return reject(response, 404, "Plan not found.");
      const pages = id ? await sql`select * from public.drawing_pages where drawing_id = ${id}::uuid order by page_number` : [];
      response.setHeader("Cache-Control", "no-store");
      return response.status(200).json(id ? { drawing: drawings[0], pages } : { drawings });
    }
    if (request.method !== "POST") return reject(response, 405, "Method not allowed");
    const body = request.body || {};
    if (body.action === "create") {
      const { name, pathname, pageCount } = body;
      if (typeof name !== "string" || !name.trim() || name.length > 180 ||
          typeof pathname !== "string" || !PLAN_PATH.test(pathname) ||
          !Number.isInteger(pageCount) || pageCount < 1 || pageCount > 200) return reject(response, 400, "Invalid plan details.");
      const blob = await head(pathname, { access: "private" });
      if (!blob || blob.contentType !== "application/pdf" || blob.size > 50 * 1024 * 1024) return reject(response, 400, "Uploaded PDF not found.");
      const rows = await sql`with drawing as (
          insert into public.drawings(name, blob_path, page_count)
          values (${name.trim()}, ${pathname}, ${pageCount}) returning *
        ), takeoff as (
          insert into public.takeoffs(drawing_id) select id from drawing returning id
        ) select drawing.* from drawing join takeoff on true`;
      response.setHeader("Cache-Control", "no-store");
      return response.status(201).json({ drawing: rows[0] });
    }
    if (body.action === "saveText") {
      const { drawingId, pageNumber, text, method } = body;
      if (!UUID.test(drawingId || "") || !Number.isInteger(pageNumber) || pageNumber < 1 ||
          typeof text !== "string" || text.length > 50000 ||
          !["pdf-text", "ocr", "none"].includes(method)) return reject(response, 400, "Invalid page text.");
      const drawing = await sql`select page_count from public.drawings where id = ${drawingId}::uuid`;
      if (!drawing.length || pageNumber > drawing[0].page_count) return reject(response, 404, "Plan page not found.");
      const rows = await sql`insert into public.drawing_pages(drawing_id, page_number, extracted_text, extraction_method)
        values (${drawingId}::uuid, ${pageNumber}, ${text}, ${method})
        on conflict (drawing_id, page_number) do update set extracted_text = excluded.extracted_text,
        extraction_method = excluded.extraction_method, updated_at = now() returning *`;
      return response.status(200).json({ page: rows[0] });
    }
    return reject(response, 400, "Unknown plan action.");
  } catch (error) { return dbError(response, error); }
}
