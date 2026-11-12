import { neon } from "@neondatabase/serverless";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.DATABASE_URL) {
    return response.status(503).json({ error: "Demo database is not configured" });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const [locations, suppliers, materials, inventory_items] = await Promise.all([
      sql`select * from public.locations order by sort_order, name`,
      sql`select * from public.suppliers order by name`,
      sql`select * from public.materials order by name`,
      sql`select * from public.inventory_items order by updated_at desc`,
    ]);
    response.setHeader("Cache-Control", "no-store");
    return response.status(200).json({ locations, suppliers, materials, inventory_items });
  } catch (error) {
    console.error("Demo inventory query failed", error);
    return response.status(503).json({ error: "Demo inventory is temporarily unavailable" });
  }
}
