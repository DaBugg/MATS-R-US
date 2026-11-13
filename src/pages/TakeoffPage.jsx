import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { extractPageText, openPdf, renderPage } from "../lib/pdfPlans.js";
import { fetchPlanBytes, planRequest } from "../lib/planClient.js";

const newItem = () => ({ id: null, clientId: crypto.randomUUID(), materialId: "", description: "", quantity: "1", unit: "ea", evidence: "", status: "review", x: null, y: null });

export default function TakeoffPage() {
  const { id } = useParams();
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);
  const [planWidth,setPlanWidth]=useState(600);
  const [zoom,setZoom]=useState(1);
  const [drawing, setDrawing] = useState(null);
  const [pages, setPages] = useState([]);
  const [pdf, setPdf] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [takeoff, setTakeoff] = useState(null);
  const [items, setItems] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState(newItem);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    let loadedPdf;
    (async () => {
      try {
        const [plan, review, catalog, bytes] = await Promise.all([
          planRequest(`/api/plans?id=${encodeURIComponent(id)}`),
          planRequest(`/api/takeoff?drawingId=${encodeURIComponent(id)}`),
          fetch("/api/bootstrap", { cache: "no-store" }).then((r) => r.json()),
          fetchPlanBytes(id),
        ]);
        loadedPdf = await openPdf(bytes);
        if (!alive) { await loadedPdf.destroy(); return; }
        setDrawing(plan.drawing); setPages(plan.pages); setTakeoff(review.takeoff);
        setItems(review.items); setMaterials(catalog.materials || []); setPdf(loadedPdf);
      } catch (e) { if (alive) setError(e.message); }
    })();
    return () => { alive = false; if (loadedPdf) loadedPdf.destroy(); };
  }, [id]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setPlanWidth(entry.contentRect.width));
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let active = true;
    let renderTask;
    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (!active || !canvasRef.current) return;
        const natural = page.getViewport({scale:1});
        const scale = Math.min((planWidth-24)/natural.width*zoom,6000/Math.max(natural.width,natural.height));
        await renderPage(page, canvasRef.current, Math.max(.1,scale), (task) => { renderTask = task; });
        if (active && canvasRef.current) setCanvasSize({ width: canvasRef.current.width, height: canvasRef.current.height });
      } catch (e) { if (active) setError(`Could not render page: ${e.message}`); }
    })();
    return () => { active = false; renderTask?.cancel(); };
  }, [pdf, pageNumber, planWidth, zoom]);

  async function extract(all = false, forceOcr = false) {
    if (!pdf) return;
    setError(""); setBusy("extract");
    try {
      const targets = all ? Array.from({ length: pdf.numPages }, (_, i) => i + 1).filter((n) => !pages.some((p) => p.page_number === n)) : [pageNumber];
      for (const n of targets) {
        setMessage(`Extracting page ${n} of ${pdf.numPages}…`);
        const page = await pdf.getPage(n);
        const result = await extractPageText(page, forceOcr);
        const saved = await planRequest("/api/plans", { action: "saveText", drawingId: id, pageNumber: n, text: result.text, method: result.method });
        setPages((old) => [...old.filter((p) => p.page_number !== n), saved.page]);
      }
      setMessage(targets.length ? `Extracted text from ${targets.length} ${targets.length === 1 ? "page" : "pages"}. Review it before using it as evidence.` : "All pages already have extracted text.");
    } catch (e) { setError(e.message); }
    finally { setBusy(""); }
  }

  function selectPoint(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    setForm((old) => ({ ...old, x, y }));
    setMessage("Plan location selected. Complete the material details and save.");
  }

  function selectMaterial(materialId) {
    const material = materials.find((m) => m.id === materialId);
    setForm((old) => ({ ...old, materialId, description: material?.name || old.description, unit: material?.default_unit || old.unit }));
  }

  async function saveItem(event) {
    event.preventDefault(); setBusy("save"); setError("");
    try {
      const { item } = await planRequest("/api/takeoff", {
        action: "saveItem", drawingId: id, id: form.id, clientId: form.clientId, materialId: form.materialId || null,
        description: form.description, quantity: Number(form.quantity), unit: form.unit,
        pageNumber, x: form.x, y: form.y, evidence: form.evidence, status: form.status,
      });
      setItems((old) => [...old.filter((row) => row.id !== item.id), item].sort((a, b) => a.page_number - b.page_number));
      setTakeoff((old) => ({ ...old, status: "draft", approved_at: null }));
      setForm(newItem()); setMessage("Material item saved.");
    } catch (e) { setError(e.message); }
    finally { setBusy(""); }
  }

  async function deleteItem(itemId) {
    setBusy("delete"); setError("");
    try {
      await planRequest("/api/takeoff", { action: "deleteItem", drawingId: id, id: itemId });
      setItems((old) => old.filter((row) => row.id !== itemId));
      setTakeoff((old) => ({ ...old, status: "draft", approved_at: null }));
      setForm(newItem()); setMessage("Item removed.");
    } catch (e) { setError(e.message); }
    finally { setBusy(""); }
  }

  async function approve() {
    setBusy("approve"); setError("");
    try {
      const result = await planRequest("/api/takeoff", { action: "approve", drawingId: id });
      setTakeoff(result.takeoff); setMessage("Takeoff approved. Its confirmed items now appear in order sheets.");
    } catch (e) { setError(e.message); }
    finally { setBusy(""); }
  }

  const pageText = pages.find((p) => p.page_number === pageNumber);
  const pageItems = items.filter((item) => item.page_number === pageNumber && item.status !== "rejected");
  const reviewCount = items.filter((item) => item.status === "review").length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Link to="/drawings" className="text-sm text-blue-700 hover:underline">← Drawings</Link><h2 className="mt-1 text-2xl font-semibold">{drawing?.name || "Loading plan…"}</h2><p className="text-sm text-slate-600">Click the plan to mark a material. OCR text is reference evidence, not a confirmed count.</p></div>
        <div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${takeoff?.status === "approved" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{takeoff?.status || "Loading"}</span><Link to="/requirements" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Order sheets</Link></div>
      </div>
      {message && <p role="status" className="rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800">{message}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(330px,1fr)]">
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3">
            <div className="flex items-center gap-2"><button disabled={pageNumber <= 1} onClick={() => setPageNumber((n) => n - 1)} className="rounded border px-2 py-1 disabled:opacity-40">←</button><span className="text-sm font-medium">Page {pageNumber} of {drawing?.page_count || 1}</span><button disabled={pageNumber >= (drawing?.page_count || 1)} onClick={() => setPageNumber((n) => n + 1)} className="rounded border px-2 py-1 disabled:opacity-40">→</button></div>
            <div className="flex flex-wrap gap-2"><button disabled={!!busy || !pdf} onClick={() => extract(false, false)} className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50">Extract this page</button><button disabled={!!busy || !pdf} onClick={() => extract(false, true)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Run OCR</button><button disabled={!!busy || !pdf} onClick={() => extract(true, false)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Extract remaining</button></div>
          </div>
          <div className="flex items-center gap-2 border-b p-2 text-xs"><button onClick={()=>setZoom(z=>Math.max(1,z-1))} disabled={zoom===1} aria-label="Zoom out" className="rounded border px-3 py-1 disabled:opacity-40">−</button><button onClick={()=>setZoom(1)} className="rounded border px-3 py-1">Fit width</button><button onClick={()=>setZoom(z=>Math.min(4,z+1))} disabled={zoom===4} aria-label="Zoom in" className="rounded border px-3 py-1 disabled:opacity-40">+</button><span>{zoom}×</span></div>
          <div ref={viewportRef} className="max-h-[75vh] overflow-auto bg-slate-200 p-3">
            <div className="relative mx-auto shadow-lg" style={{ width: canvasSize.width || "fit-content", height: canvasSize.height || "auto" }}>
              <canvas key={pageNumber} ref={canvasRef} className="block bg-white" />
              <button type="button" onClick={selectPoint} className="absolute inset-0 w-full cursor-crosshair" aria-label="Select material location on plan" />
              {pageItems.filter((item) => item.x != null && item.y != null).map((item) => <button key={item.id} type="button" title={item.description} onClick={(e) => { e.stopPropagation(); setForm({ id: item.id, clientId: null, materialId: item.material_id || "", description: item.description, quantity: String(item.quantity), unit: item.unit, evidence: item.evidence, status: item.status, x: Number(item.x), y: Number(item.y) }); }} className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow ${item.status === "confirmed" ? "bg-green-600" : "bg-amber-600"}`} style={{ left: `${Number(item.x) * 100}%`, top: `${Number(item.y) * 100}%` }}>✓</button>)}
              {form.x != null && form.y != null && <span className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow" style={{ left: `${form.x * 100}%`, top: `${form.y * 100}%` }} />}
            </div>
          </div>
        </section>
        <div className="space-y-5">
          <form onSubmit={saveItem} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between"><h3 className="font-semibold">{form.id ? "Edit material" : "Add material"}</h3>{form.id && <button type="button" className="text-xs text-blue-700" onClick={() => setForm(newItem())}>New item</button>}</div>
            <label className="block text-xs font-medium text-slate-600">Match inventory material<select className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" value={form.materialId} onChange={(e) => selectMaterial(e.target.value)}><option value="">Unmatched · needs review</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
            <label className="block text-xs font-medium text-slate-600">Description<input required maxLength="180" className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="2 in PVC DWV 90° elbow" /></label>
            <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-medium text-slate-600">Quantity<input required min="0.01" max="9999999999" step="0.01" type="number" className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label><label className="block text-xs font-medium text-slate-600">Unit<input required maxLength="40" className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label></div>
            <label className="block text-xs font-medium text-slate-600">Evidence or note<textarea maxLength="500" rows="2" className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} placeholder="Drawing callout, symbol, or manual measurement" /></label>
            <label className="block text-xs font-medium text-slate-600">Review status<select className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="review">Needs review</option><option value="confirmed">Confirmed</option><option value="rejected">Rejected</option></select></label>
            <div className="flex gap-2"><button disabled={!!busy} className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save item</button>{form.id && <button type="button" disabled={!!busy} onClick={() => deleteItem(form.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700">Remove</button>}</div>
            <p className="text-xs text-slate-500">Confirmed items require an exact inventory material match. Saving an edit returns the takeoff to draft.</p>
          </form>
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="font-semibold">Extracted text · page {pageNumber}</h3><p className="mt-1 text-xs text-slate-500">{pageText ? `Source: ${pageText.extraction_method}` : "Not extracted yet"}</p><pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{pageText?.extracted_text || "Use Extract this page to read embedded text or run OCR for a scanned sheet."}</pre></section>
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-semibold">Takeoff items</h3><span className="text-xs text-slate-500">{items.length} total · {reviewCount} need review</span></div><ul className="mt-3 max-h-64 divide-y overflow-auto">{items.map((item) => <li key={item.id} className="flex items-start justify-between gap-2 py-2 text-sm"><button className="text-left hover:text-blue-700" onClick={() => { setPageNumber(item.page_number); setForm({ id: item.id, clientId: null, materialId: item.material_id || "", description: item.description, quantity: String(item.quantity), unit: item.unit, evidence: item.evidence, status: item.status, x: item.x == null ? null : Number(item.x), y: item.y == null ? null : Number(item.y) }); }}><span className="font-medium">{item.description}</span><span className="block text-xs text-slate-500">Page {item.page_number} · {item.quantity} {item.unit}</span></button><span className={`shrink-0 rounded px-2 py-0.5 text-xs ${item.status === "confirmed" ? "bg-green-100 text-green-800" : item.status === "rejected" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800"}`}>{item.status}</span></li>)}</ul><button disabled={!!busy || !items.length || reviewCount > 0} onClick={approve} className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Approve takeoff</button><p className="mt-2 text-xs text-slate-500">Approval adds confirmed quantities to requirements. It does not add stock.</p></section>
        </div>
      </div>
    </div>
  );
}
