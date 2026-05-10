import { Link, useLocation } from "react-router-dom";

const ROUTE_TITLES = {
  "/": "Locations",
  "/locations": "Locations",
  "/inventory": "Inventory",
  "/add": "Add Material",
  "/movements": "Movements",
  "/settings": "Settings",
};

export default function TopHeader({ onOpenMenu, projectName = "North Tower" }) {
  const { pathname } = useLocation();
  const title = ROUTE_TITLES[pathname] ?? "SNL Inventory";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 md:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Open navigation menu"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-slate-900 md:text-lg">
            {title}
          </h1>
          <p className="truncate text-xs text-slate-500">
            <span className="font-medium text-slate-700">{projectName}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            Track materials, locations, and movement from one dashboard
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/add"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">Add Material</span>
            <span className="sm:hidden">Add</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
