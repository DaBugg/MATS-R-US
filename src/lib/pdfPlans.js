import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function openPdf(bytes) {
  return pdfjs.getDocument({ data: bytes }).promise;
}

export async function renderPage(page, canvas, scale = 1.3, onTask) {
  const viewport = page.getViewport({ scale });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const task = page.render({ canvasContext: canvas.getContext("2d"), viewport });
  onTask?.(task);
  await task.promise;
}

export async function extractPageText(page, forceOcr = false) {
  if (!forceOcr) {
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str || "").join(" ").replace(/\s+/g, " ").trim();
    if (text.length >= 25) return { text, method: "pdf-text" };
  }
  const canvas = document.createElement("canvas");
  const natural = page.getViewport({ scale: 1 });
  const scale = Math.min(2, 3200 / Math.max(natural.width, natural.height));
  await renderPage(page, canvas, scale);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(canvas);
    return { text: result.data.text.trim().slice(0, 50000), method: "ocr" };
  } finally {
    await worker.terminate();
  }
}
