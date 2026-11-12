import { neon } from "@neondatabase/serverless";
import { issueSignedToken, presignUrl } from "@vercel/blob";
import { authorize, reject } from "./_auth.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(request, response) {
  if (request.method !== "GET") return reject(response, 405, "Method not allowed");
  if (authorize(request) !== "site-editor") return reject(response, 401, "Invalid editor key.");
  const id = request.query.id;
  if (!UUID.test(id || "")) return reject(response, 400, "Invalid plan ID.");
  if (!process.env.DATABASE_URL) return reject(response, 503, "Database is not configured.");
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`select blob_path from public.drawings where id = ${id}::uuid`;
    if (!rows.length) return reject(response, 404, "Plan not found.");
    const validUntil = Date.now() + 5 * 60 * 1000;
    const token = await issueSignedToken({ pathname: rows[0].blob_path, operations: ["get"], validUntil });
    const { presignedUrl } = await presignUrl(token, { pathname: rows[0].blob_path, operation: "get", validUntil });
    response.setHeader("Cache-Control", "private, no-store");
    return response.status(200).json({ url: presignedUrl });
  } catch (error) {
    console.error("Plan download failed", error);
    if (!response.headersSent) return reject(response, 503, "Plan file is temporarily unavailable.");
    response.destroy(error);
  }
}
