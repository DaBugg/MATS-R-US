import { timingSafeEqual } from "node:crypto";

function matches(value, secret) {
  if (!value || !secret || secret.length < 32) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authorize(request) {
  const header = request.headers.authorization || "";
  const token = /^Bearer (.+)$/.exec(header)?.[1];
  if (matches(token, process.env.EDITOR_WRITE_TOKEN)) return "site-editor";
  if (matches(token, process.env.DOT_WRITE_TOKEN)) return "dot";
  return null;
}

export function reject(response, status, message) {
  response.setHeader("Cache-Control", "no-store");
  return response.status(status).json({ error: message });
}

export function dbError(response, error) {
  console.error("Inventory write failed", error);
  const known = ["23505", "23503", "23514", "P0001", "P0002", "22P02"].includes(error?.code);
  const message = known ? error.message : "Inventory save failed. Try again shortly.";
  return reject(response, known ? 400 : 503, message);
}
