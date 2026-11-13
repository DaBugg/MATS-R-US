import { useState } from "react";
import { planRequest } from "../../lib/planClient.js";
import { purchaseStatus } from "../../lib/purchasing.js";
const fmt = n => new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(n);
const field = "rounded-lg border border-slate-300 p-2 text-sm";
export default function PurchaseOrders({ orders, lines, receipts, shortages, refresh, disabled }) {
  const [number,setNumber]=useState(""); const [supplier,setSupplier]=useState(""); const [date,setDate]=useState("");
  const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [message,setMessage]=useState("");
  const [draftId,setDraftId]=useState(()=>crypto.randomUUID());
  const [pending,setPending]=useState(null);
  async function save(body) {
    setBusy(true);setError("");setMessage("");
    try { await planRequest("/api/purchase-orders",body); const fresh = await refresh(); setMessage(fresh ? "PO tracking saved. Inventory quantities were not changed." : "PO saved, but refresh failed. Refresh stock before another change."); return true; }
    catch(e){setError(e.message);return false;} finally{setBusy(false);}
  }
  async function create(e) {
    e.preventDefault();
    if(await save({action:"create",id:draftId,number,supplier,expectedDate:date,lines:shortages.map(r=>({materialId:r.material_id,unit:r.unit,quantity:r.to_order}))})){
      setNumber("");setSupplier("");setDate("");setDraftId(crypto.randomUUID());
    }
  }
  async function receive(e,line) {
    e.preventDefault();
    const quantity=Number(new FormData(e.currentTarget).get("quantity"));
    if(pending && (pending.lineId!==line.id || pending.quantity!==quantity)){setError("Retry the pending delivery with its original quantity before logging another delivery.");return;}
    const request=pending?.lineId===line.id && pending.quantity===quantity ? pending : {action:"receipt",id:crypto.randomUUID(),lineId:line.id,quantity};
    setPending(request);
    if(await save(request)){setPending(null);e.target.reset();}
  }
  return <section className="space-y-4" aria-label="Purchase order tracking">
    <div><h3 className="text-xl font-semibold">Purchase orders</h3><p className="text-sm text-slate-600">Save a draft from the shortages above, then mark it ordered when sent to the supplier.</p></div>
    {error&&<p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
    {message&&<p role="status" className="rounded bg-blue-50 p-3 text-blue-800">{message}</p>}
    <form onSubmit={create} className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
      <label className="grid gap-1 text-sm">PO number<input required maxLength={80} className={field} value={number} onChange={e=>setNumber(e.target.value)}/></label>
      <label className="grid gap-1 text-sm">Supplier<input required maxLength={180} className={field} value={supplier} onChange={e=>setSupplier(e.target.value)}/></label>
      <label className="grid gap-1 text-sm">Expected delivery<input type="date" className={field} value={date} onChange={e=>setDate(e.target.value)}/></label>
      <button disabled={disabled||busy||!shortages.length} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Save draft · {shortages.length} lines</button>
      <p className="w-full text-xs text-slate-500">Saves the current recommended quantities. Drafts do not reduce shortages. No order is sent automatically.</p>
    </form>
    {!orders.length&&<p className="rounded-xl border bg-white p-5 text-sm text-slate-500">No purchase orders saved yet.</p>}
    {orders.map(order=>{
      const items=lines.filter(l=>l.purchase_order_id===order.id);const status=purchaseStatus(order,lines);
      const overdue=order.expected_date&&order.expected_date.slice(0,10)<new Date().toLocaleDateString("en-CA")&&["ordered","partially received"].includes(status);
      return <article key={order.id} className="overflow-hidden rounded-xl border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h4 className="font-semibold">{order.number} · {order.supplier}</h4><p className={`text-xs ${overdue?"text-red-700":"text-slate-500"}`}>{order.expected_date?`Expected ${order.expected_date.slice(0,10)}${overdue?" · Overdue":""}`:"No expected date"}</p></div><div className="flex items-center gap-2"><span className="rounded bg-slate-100 px-2 py-1 text-sm capitalize">{status}</span>{order.status==="draft"&&<button disabled={disabled||busy} onClick={()=>save({action:"status",id:order.id,status:"ordered"})} className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Mark ordered</button>}{["draft","ordered"].includes(status)&&<button disabled={disabled||busy} onClick={()=>save({action:"status",id:order.id,status:"cancelled"})} className="rounded border px-3 py-2 text-sm">Cancel PO</button>}</div></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{["Material","Ordered","Delivered","Remaining","Log delivery"].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{items.map(line=><tr key={line.id} className="border-t"><td className="p-3">{line.name}<span className="block text-xs text-slate-500">{line.unit}</span></td><td className="p-3">{fmt(line.quantity)}</td><td className="p-3">{fmt(line.received)}</td><td className="p-3">{fmt(Number(line.quantity)-Number(line.received))}</td><td className="p-3">{order.status==="ordered"&&Number(line.received)<Number(line.quantity)?<form className="flex gap-2" onSubmit={e=>receive(e,line)}><input name="quantity" type="number" min="0.01" step="0.01" max={Number(line.quantity)-Number(line.received)} required aria-label={`Delivery quantity for ${line.name}`} className={`${field} w-24`}/><button disabled={disabled||busy} className="rounded border px-3 disabled:opacity-40">Log</button></form>:"—"}</td></tr>)}</tbody></table></div>
        <details className="border-t p-3 text-xs text-slate-600"><summary>Delivery history</summary><ul className="mt-2 space-y-1">{receipts.filter(r=>items.some(l=>l.id===r.line_id)).map(r=>{const l=items.find(l=>l.id===r.line_id);return <li key={r.id}>{new Date(r.created_at).toLocaleString()} · {l.name} · {fmt(r.quantity)} {l.unit}</li>;})}</ul></details>
      </article>;
    })}
    <p className="text-xs text-amber-800">Deliveries log PO progress only. Update shared stock separately after approval of the exact material, location, and quantity. Reconcile delivered stock before placing another PO.</p>
  </section>;
}
