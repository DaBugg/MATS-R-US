import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { openPdf } from "../lib/pdfPlans.js";
import { planRequest, uploadPlan } from "../lib/planClient.js";

export default function DrawingsPage() {
  const [drawings, setDrawings] = useState([]);
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    planRequest("/api/plans").then(({ drawings: rows }) => {
      if (!Array.isArray(rows)) throw new Error("Plan library returned incomplete data.");
      setDrawings(rows);
    }).catch((e) => setError(e.message));
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError("");
    let pdf;
    try {
      setProgress("Reading PDF…");
      pdf = await openPdf(new Uint8Array(await file.arrayBuffer()));
      if (pdf.numPages > 200) throw new Error("Plans are limited to 200 pages.");
      setProgress("Uploading privately…");
      const blob = await uploadPlan(file, ({ percentage }) => setProgress(`Uploading ${Math.round(percentage)}%…`));
      const { drawing } = await planRequest("/api/plans", {
        action: "create", name: name.trim() || file.name, pathname: blob.pathname, pageCount: pdf.numPages,
      });
      setDrawings((rows) => [drawing, ...rows]);
      setFile(null);
      setName("");
      event.target.reset();
      setProgress("Plan saved. Open it to extract text and mark materials.");
    } catch (e) { setError(e.message); setProgress(""); }
    finally { await pdf?.destroy(); setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">PBAU · Plan scanner</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">Drawings</h2>
        <p className="mt-1 text-sm text-slate-600">Upload original PDFs. Text extraction and material counts are saved separately from the drawing.</p>
      </div>
      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Add a plumbing plan</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="block text-sm font-medium text-slate-700">PDF file
            <input className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm" type="file" accept="application/pdf,.pdf" required onChange={(e) => { setFile(e.target.files?.[0] || null); if (!name) setName(e.target.files?.[0]?.name.replace(/\.pdf$/i, "") || ""); }} />
          </label>
          <label className="block text-sm font-medium text-slate-700">Drawing name
            <input className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm" value={name} maxLength="180" onChange={(e) => setName(e.target.value)} placeholder="P-102 · Domestic Water" />
          </label>
          <button disabled={busy || !file} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Upload plan"}</button>
        </div>
        <p className="mt-3 text-xs text-slate-500">PDF only · 50 MB maximum · stored in private Vercel Blob storage</p>
        {progress && <p role="status" className="mt-3 text-sm text-blue-700">{progress}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </form>
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4"><h3 className="font-semibold">Plan library</h3></div>
        {drawings.length === 0 ? <p className="p-5 text-sm text-slate-500">No plans yet. Upload a contractor PDF to begin.</p> :
          <ul className="divide-y divide-slate-100">{drawings.map((drawing) => <li key={drawing.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0"><p className="truncate font-medium">{drawing.name}</p><p className="text-xs text-slate-500">{drawing.page_count} {drawing.page_count === 1 ? "page" : "pages"} · {new Date(drawing.created_at).toLocaleDateString()}</p></div>
            <Link to={`/takeoffs/${drawing.id}`} className="shrink-0 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Open takeoff</Link>
          </li>)}</ul>}
      </section>
    </div>
  );
}
