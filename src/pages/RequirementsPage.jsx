import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PurchaseOrders from "../components/plans/PurchaseOrders.jsx";
import { outstandingByMaterial } from "../lib/purchasing.js";
import { planRequest } from "../lib/planClient.js";

const fmt = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
const csvCell = (value) => {
  const raw = String(value ?? "");
  const safe = /^[=+@-]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
};

export default function RequirementsPage() {
  const [rows, setRows] = useState([]);
  const [purchasing,setPurchasing]=useState({orders:[],lines:[],receipts:[]});
  const [poError,setPoError]=useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true); setError("");
    try {
      const [requirements, orders] = await Promise.allSettled([planRequest("/api/requirements"),planRequest("/api/purchase-orders")]);
      if(requirements.status!=="fulfilled") throw requirements.reason;
      setRows(requirements.value.rows);
      if(orders.status==="fulfilled"){setPurchasing(orders.value);setPoError("");return true;}
      setPoError("PO tracking is unavailable. Apply the PO schema migration before using purchasing recommendations.");return false;
    }
    catch (e) { setError(e.message); return false; }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  const outstanding=outstandingByMaterial(purchasing.orders,purchasing.lines);
  const adjusted=rows.map(r=>({...r,on_order:outstanding.get(`${r.material_id}:${r.unit}`)||0,to_order:Math.max(0,r.required-r.available-(outstanding.get(`${r.material_id}:${r.unit}`)||0))}));

  function download() {
    const header = ["Material", "Unit", "Required", "Available", "On order", "To order", "Plans", "Unit mismatch"];
    const data = adjusted.filter((r) => r.to_order > 0).map((r) => [r.name, r.unit, r.required, r.available, r.on_order, r.to_order, r.plan_count, r.unit_mismatch ? "Review" : ""]);
    const csv = [header, ...data].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `pbau-order-sheet-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const shortages = adjusted.filter((r) => r.to_order > 0);
  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">PBAU · Purchasing</p><h2 className="mt-1 text-2xl font-semibold">Order sheets</h2><p className="mt-1 text-sm text-slate-600">Approved takeoff quantities compared with current Neon stock. This is a draft purchase recommendation.</p></div><div className="flex gap-2"><button onClick={refresh} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Refresh stock</button><button disabled={!shortages.length || !!poError || loading} onClick={download} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Download CSV</button></div></div>
    {poError && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{poError}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h3 className="font-semibold">Materials to order</h3><span className="text-sm text-slate-500">{shortages.length} shortages</span></div>{loading ? <p className="p-5 text-sm text-slate-500">Calculating from approved plans…</p> : !rows.length ? <div className="p-5 text-sm text-slate-600">No approved material requirements yet. <Link className="text-blue-700 underline" to="/drawings">Open a drawing</Link> to confirm and approve a takeoff.</div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Material</th><th className="px-4 py-3">Required</th><th className="px-4 py-3">Available</th><th className="px-4 py-3">On order</th><th className="px-4 py-3">To order</th><th className="px-4 py-3">Source</th></tr></thead><tbody className="divide-y divide-slate-100">{adjusted.map((row) => <tr key={`${row.material_id}:${row.unit}`}><td className="px-5 py-4"><span className="font-medium">{row.name}</span>{row.unit_mismatch && <span className="mt-1 block text-xs text-amber-700">Stock exists in another unit; check conversion manually.</span>}</td><td className="px-4 py-4">{fmt(row.required)} {row.unit}</td><td className="px-4 py-4">{fmt(row.available)} {row.unit}</td><td className="px-4 py-4">{fmt(row.on_order)} {row.unit}</td><td className="px-4 py-4 font-semibold text-blue-700">{fmt(row.to_order)} {row.unit}</td><td className="px-4 py-4 text-slate-500">{row.plan_count} {row.plan_count === 1 ? "plan" : "plans"}</td></tr>)}</tbody></table></div>}</div>
    <PurchaseOrders {...purchasing} shortages={shortages} refresh={refresh} disabled={loading || !!error || !!poError} />
    <p className="text-xs text-slate-500">Only approved, confirmed items are included. Outstanding quantities on ordered POs reduce recommendations; drafts and cancelled POs do not. Review duplicate drawing revisions before ordering. Receiving stock remains a separate inventory action.</p>
  </div>;
}
