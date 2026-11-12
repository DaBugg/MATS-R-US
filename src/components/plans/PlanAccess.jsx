import { useEffect, useState } from "react";

export default function PlanAccess({ children }) {
  const [hasKey, setHasKey] = useState(() => Boolean(sessionStorage.getItem("mats-editor-key")));
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const update = (event) => { setHasKey(Boolean(sessionStorage.getItem("mats-editor-key"))); if (event.detail === "invalid") setError("That editor key was not accepted."); };
    window.addEventListener("mats-plan-key-changed", update);
    return () => window.removeEventListener("mats-plan-key-changed", update);
  }, []);
  if (hasKey) return children;
  return <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">PBAU · Protected plans</p>
    <h2 className="mt-2 text-xl font-semibold">Enter the editor key</h2>
    <p className="mt-2 text-sm text-slate-600">Plans, takeoffs, and order sheets are available to site editors. The key stays in this browser tab.</p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <form className="mt-5 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (!key.trim()) return; sessionStorage.setItem("mats-editor-key", key.trim()); setHasKey(true); setKey(""); setError(""); }}>
      <label className="min-w-0 flex-1 text-xs font-medium text-slate-700">Editor key<input autoComplete="off" type="password" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={key} onChange={(event) => setKey(event.target.value)} /></label>
      <button className="self-end rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Open</button>
    </form>
  </div>;
}
