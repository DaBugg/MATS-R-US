#!/usr/bin/env node
// Local bridge for a Dot-controlled Codex task. The write key stays in .env.local.
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const BASE = "https://mats-r-us.vercel.app";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const [action, ...args] = process.argv.slice(2);
const approved = args.includes("--approved");
const positional = args.filter((arg) => !arg.startsWith("--"));
const note = args.find((arg) => arg.startsWith("--note="))?.slice(7) || null;
const requestId = args.find((arg) => arg.startsWith("--request-id="))?.slice(13) || randomUUID();

function fail(message) { console.error(message); process.exitCode = 1; }
async function snapshot() {
  const response = await fetch(BASE + "/api/bootstrap", { cache: "no-store" });
  if (!response.ok) throw new Error("Inventory read failed: " + response.status);
  return response.json();
}
async function token() {
  if (process.env.DOT_WRITE_TOKEN) return process.env.DOT_WRITE_TOKEN;
  const env = await readFile(new URL("../.env.local", import.meta.url), "utf8");
  const value = env.match(/^DOT_WRITE_TOKEN=(.+)$/m)?.[1]?.trim();
  if (!value || value.length < 32) throw new Error("DOT_WRITE_TOKEN is missing from .env.local");
  return value;
}
function showRows(data, term = "") {
  const query = term.toLowerCase();
  const rows = data.inventory_items.map((row) => ({
    id: row.id,
    material: data.materials.find((m) => m.id === row.material_id)?.name,
    location: data.locations.find((l) => l.id === row.location_id)?.name,
    locationId: row.location_id,
    quantity: Number(row.quantity),
    unit: row.unit,
  })).filter((row) => !query || (row.material + " " + row.location).toLowerCase().includes(query));
  console.log(JSON.stringify(rows, null, 2));
}

try {
  if (action === "find") {
    showRows(await snapshot(), positional.join(" "));
  } else if (["add", "subtract", "move"].includes(action)) {
    const [rowId, second, third] = positional;
    const targetLocationId = action === "move" ? second : null;
    const amount = Number(action === "move" ? third : second);
    if (!UUID.test(rowId || "") || action === "move" && !UUID.test(targetLocationId || "") ||
        !Number.isFinite(amount) || amount <= 0 || amount !== Math.round(amount * 100) / 100) {
      throw new Error("Usage: find <text> | add/subtract <rowId> <amount> | move <rowId> <targetLocationId> <amount>");
    }
    if (!approved) throw new Error("Ask the user to approve this exact stock change, then rerun with --approved.");
    if (!UUID.test(requestId)) throw new Error("Invalid request ID.");
    const key = await token();
    const payload = { requestId, action, rowId, amount, targetLocationId, notes: note };
    console.log("requestId:", requestId);
    const response = await fetch(BASE + "/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Stock change failed: " + response.status);
    const data = await snapshot();
    const ids = [result.row?.id, result.source?.id, result.target?.id].filter(Boolean);
    const current = data.inventory_items.filter((row) => ids.includes(row.id)).map((row) => ({
      id: row.id, quantity: Number(row.quantity), locationId: row.location_id,
    }));
    console.log(JSON.stringify({ action, current }, null, 2));
  } else {
    throw new Error("Usage: find <text> | add/subtract <rowId> <amount> | move <rowId> <targetLocationId> <amount>");
  }
} catch (error) { fail(error.message); }
