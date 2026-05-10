import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SidebarNav from "./SidebarNav.jsx";
import TopHeader from "./TopHeader.jsx";
import { isSupabaseConfigured } from "../../lib/supabaseClient.js";

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile drawer on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open.
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-slate-200 bg-white md:block">
        <SidebarNav />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[80vw] border-r border-slate-200 bg-white shadow-lg">
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-h-screen flex-col md:pl-60">
        <TopHeader onOpenMenu={() => setMobileOpen(true)} />
        {!isSupabaseConfigured && <SupabaseBanner />}
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SupabaseBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-900">
      <div className="px-4 py-3 text-sm md:px-6">
        <strong className="font-semibold">Supabase is not configured.</strong>{" "}
        Copy <code className="rounded bg-amber-100 px-1.5 py-0.5">.env.example</code> to{" "}
        <code className="rounded bg-amber-100 px-1.5 py-0.5">.env.local</code>, paste your Supabase
        URL and publishable key, then restart{" "}
        <code className="rounded bg-amber-100 px-1.5 py-0.5">npm run dev</code>.
      </div>
    </div>
  );
}
