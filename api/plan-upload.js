import { handleUpload } from "@vercel/blob/client";
import { authorize, reject } from "./_auth.js";

const PLAN_PATH = /^plans\/[0-9a-f-]{36}\/[a-zA-Z0-9._-]{1,120}\.pdf$/i;

export default async function handler(request, response) {
  if (request.method !== "POST") return reject(response, 405, "Method not allowed");
  if (request.body?.type !== "blob.upload-completed" && authorize(request) !== "site-editor") {
    return reject(response, 401, "Invalid editor key.");
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return reject(response, 503, "Private plan storage is not configured.");
  try {
    const result = await handleUpload({
      request,
      body: request.body,
      onBeforeGenerateToken: async (pathname) => {
        if (authorize(request) !== "site-editor") throw new Error("Invalid editor key.");
        if (!PLAN_PATH.test(pathname)) throw new Error("Invalid plan path.");
        return { allowedContentTypes: ["application/pdf"], maximumSizeInBytes: 50 * 1024 * 1024, addRandomSuffix: false };
      },
      onUploadCompleted: async () => {},
    });
    response.setHeader("Cache-Control", "no-store");
    return response.status(200).json(result);
  } catch (error) {
    console.error("Plan upload failed", error);
    return reject(response, 400, "Plan upload failed. Check your editor key and PDF file.");
  }
}
