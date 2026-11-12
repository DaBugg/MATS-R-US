import { upload } from "@vercel/blob/client";

export function editorKey() {
  const key = sessionStorage.getItem("mats-editor-key");
  if (!key) throw new Error("Enter the editor key to open plans.");
  return key;
}

function clearInvalidKey() {
  sessionStorage.removeItem("mats-editor-key");
  window.dispatchEvent(new CustomEvent("mats-plan-key-changed", { detail: "invalid" }));
}

export async function planRequest(path, body) {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${editorKey()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (response.ok && !response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("Plan API is unavailable here. Run the app with Vercel Functions enabled.");
  }
  if (!response.ok) {
    if (response.status === 401) clearInvalidKey();
    throw new Error(result.error || `Request failed (${response.status}).`);
  }
  return result;
}

export async function uploadPlan(file, onProgress) {
  if (file.size > 50 * 1024 * 1024) throw new Error("PDF must be 50 MB or smaller.");
  if (!/\.pdf$/i.test(file.name)) throw new Error("Choose a PDF plan.");
  const prefix = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...prefix) !== "%PDF-") throw new Error("The selected file is not a PDF.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  return upload(`plans/${crypto.randomUUID()}/${safeName}`, file, {
    access: "private",
    contentType: "application/pdf",
    handleUploadUrl: "/api/plan-upload",
    headers: { Authorization: `Bearer ${editorKey()}` },
    multipart: file.size > 5 * 1024 * 1024,
    onUploadProgress: onProgress,
  });
}

export async function fetchPlanBytes(id) {
  const response = await fetch(`/api/plan-file?id=${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${editorKey()}` },
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 401) clearInvalidKey();
    throw new Error("Could not open the PDF plan.");
  }
  const { url } = await response.json();
  if (typeof url !== "string") throw new Error("Plan file service returned an invalid link.");
  const file = await fetch(url, { cache: "no-store" });
  if (!file.ok) throw new Error("Could not download the private PDF plan.");
  return new Uint8Array(await file.arrayBuffer());
}
