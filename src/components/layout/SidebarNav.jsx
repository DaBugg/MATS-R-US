import { NavLink } from "react-router-dom";

const ICON_BASE =
  "h-5 w-5 flex-shrink-0 text-slate-400 group-aria-[current=page]:text-blue-600";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: <DashboardIcon /> , end: true },
  { to: "/inventory", label: "Inventory", icon: <InventoryIcon /> },
  { to: "/locations", label: "Locations", icon: <LocationsIcon /> },
  { to: "/add", label: "Add Material", icon: <AddIcon />, accent: true },
  { to: "/counts", label: "Counts", icon: <CountsIcon />, soon: true },
  { to: "/workers", label: "Workers", icon: <WorkersIcon />, soon: true },
  { to: "/reports", label: "Reports", icon: <ReportsIcon />, soon: true },
  { to: "/settings", label: "Settings", icon: <SettingsIcon />, soon: true },
];

export default function SidebarNav({ onNavigate }) {
  return (
    <nav aria-label="Primary" className="flex h-full flex-col gap-1 p-3">
      <div className="px-2 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            SNL
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">
              SNL Inventory
            </div>
            <div className="text-[11px] text-slate-500">
              Mats-R-Us · Jobsite Tools
            </div>
          </div>
        </div>
      </div>

      <ul className="mt-2 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-100",
                  item.accent && !isActive ? "text-blue-700" : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.soon && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Soon
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="mt-auto px-3 py-3 text-[11px] text-slate-400">
        <p>v0.1 MVP</p>
        <p>Realtime · Supabase</p>
      </div>
    </nav>
  );
}

function DashboardIcon() {
  return (
    <svg className={ICON_BASE} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg className={ICON_BASE} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" />
    </svg>
  );
}

function LocationsIcon() {
  return (
    <svg className={ICON_BASE} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 21V8l8-5 8 5v13" />
      <path d="M9 21v-7h6v7" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg className={ICON_BASE} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

function CountsIcon() {
  return (
    <svg className={ICON_BASE} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 11l3 3 8-8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7" strokeLinecap="round" />
    </svg>
  );
}

function WorkersIcon() {
  return (
    <svg className={ICON_BASE} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
      <path d="M14 20c0-2.5 2-4.5 5-4.5" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg className={ICON_BASE} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3h11l4 4v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M9 13l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className={ICON_BASE} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
