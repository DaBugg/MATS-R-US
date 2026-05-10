import { Link } from "react-router-dom";

const PAGES = {
  movements: {
    title: "Movements",
    blurb:
      "A full transaction log of every add, subtract, and material movement on the jobsite.",
    bullets: [
      "Per-item history of quantity changes",
      "Filter by location, material, or worker",
      "Reasons captured for subtractions (installed, damaged, count correction…)",
      "Requires the inventory_transactions table — see TODO_DATABASE_MIGRATION.md",
    ],
    cta: { to: "/inventory", label: "Browse current inventory →" },
  },
  settings: {
    title: "Settings",
    blurb: "Project preferences, integrations, and (eventually) auth.",
    bullets: [
      "Project / site name",
      "Default units and material categories",
      "Supabase connection status",
      "Roles & permissions when auth ships",
    ],
    cta: { to: "/locations", label: "Back to locations →" },
  },
};

export default function PlaceholderPage({ pageKey }) {
  const page = PAGES[pageKey] ?? {
    title: "Coming Soon",
    blurb: "This page isn't built yet.",
    bullets: [],
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Coming in v1.1
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {page.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{page.blurb}</p>

        {page.bullets.length > 0 && (
          <>
            <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Roadmap
            </h2>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {page.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {page.cta && (
          <div className="mt-7 border-t border-slate-100 pt-5">
            <Link
              to={page.cta.to}
              className="inline-flex items-center text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              {page.cta.label}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
