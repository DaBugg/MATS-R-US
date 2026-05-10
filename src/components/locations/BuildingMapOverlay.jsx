import { getHeatLevel } from "../../lib/heatMap.js";

// Floor labels live ON the building (per the v2 brief). Each row is a real
// click target inside the SVG with an ARIA label and keyboard support, and
// the heat tint comes from the page-level normalization so the gradient
// reads consistently across floors and connex cards.

const FLOOR_HEIGHT = 38;
const BUILDING_X = 60;
const BUILDING_WIDTH = 480;
const ROOF_HEIGHT = 46;
const LOBBY_HEIGHT = 60;
const GROUND_HEIGHT = 22;
const SVG_WIDTH = BUILDING_X * 2 + BUILDING_WIDTH;

// Mirrors the Tailwind orange palette used for the heat key swatches.
const HEAT_FILL = ["#ffffff", "#fff7ed", "#ffedd5", "#fed7aa", "#fdba74"];
const HEAT_STROKE = ["#e2e8f0", "#fed7aa", "#fdba74", "#fb923c", "#f97316"];

function fmt(n) {
  if (!Number.isFinite(n)) return "0";
  if (Number.isInteger(n)) return new Intl.NumberFormat("en-US").format(n);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

export default function BuildingMapOverlay({
  buildingName = "North Tower",
  floors,
  statsByLocation,
  heatMaxes,
  selectedLocationId,
}) {
  // Top-down: Floor 21 first (visually on top), Floor 1 last.
  const orderedTopDown = [...floors].sort(
    (a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0),
  );

  const buildingHeight = Math.max(
    orderedTopDown.length * FLOOR_HEIGHT,
    FLOOR_HEIGHT,
  );
  const TOP_Y = ROOF_HEIGHT + 12;
  const buildingBottomY = TOP_Y + buildingHeight;
  const lobbyBottomY = buildingBottomY + LOBBY_HEIGHT;
  const groundBottomY = lobbyBottomY + GROUND_HEIGHT;
  const SVG_HEIGHT = groundBottomY + 14;

  const totals = floors.reduce(
    (acc, f) => {
      const s = statsByLocation?.get(f.id);
      acc.lines += s?.lineCount ?? 0;
      acc.units += s?.unitTotal ?? 0;
      return acc;
    },
    { lines: 0, units: 0 },
  );

  return (
    <section
      aria-labelledby="building-map-heading"
      className="overflow-hidden rounded-2xl border border-[--color-site-border] bg-[--color-site-card] shadow-[--shadow-card]"
    >
      <header className="border-b border-slate-100 bg-[--color-site-muted]/60 px-5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Building
        </p>
        <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="building-map-heading"
            className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
          >
            {buildingName}
          </h2>
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {orderedTopDown.length}{" "}
              {orderedTopDown.length === 1 ? "floor" : "floors"}
            </span>
            <span className="mx-1.5 text-slate-300">·</span>
            {totals.lines} {totals.lines === 1 ? "line" : "lines"}
            <span className="mx-1.5 text-slate-300">·</span>
            {totals.units} {totals.units === 1 ? "unit" : "units"}
          </p>
        </div>
      </header>

      <div className="px-3 py-4 sm:px-4 md:p-5">
        {orderedTopDown.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            No active floors. Use the Add Floor form on the right, or run{" "}
            <code className="rounded bg-slate-100 px-1">
              supabase/sql/10_activate_floors_1_to_21.sql
            </code>
            .
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="block h-auto w-full select-none"
            role="img"
            aria-label={`${buildingName} elevation with ${orderedTopDown.length} floors. Click any floor to inspect.`}
          >
            <defs>
              <pattern
                id="bmGroundHatch"
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="6"
                  stroke="#1f1d1b"
                  strokeWidth="0.8"
                />
              </pattern>
              <filter id="bmShadow" x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow
                  dx="0"
                  dy="4"
                  stdDeviation="6"
                  floodColor="#000"
                  floodOpacity="0.10"
                />
              </filter>
            </defs>

            {/* Roof */}
            <polygon
              points={`${BUILDING_X},${TOP_Y} ${BUILDING_X + BUILDING_WIDTH / 2},${TOP_Y - ROOF_HEIGHT} ${BUILDING_X + BUILDING_WIDTH},${TOP_Y}`}
              fill="#1f2937"
            />
            <rect
              x={BUILDING_X + BUILDING_WIDTH / 2 - 30}
              y={TOP_Y - 16}
              width={60}
              height="6"
              fill="#374151"
            />
            <rect
              x={BUILDING_X + BUILDING_WIDTH / 2 - 12}
              y={TOP_Y - 30}
              width={24}
              height={14}
              fill="#1f2937"
            />

            <g filter="url(#bmShadow)">
              {/* Outer building rect */}
              <rect
                x={BUILDING_X}
                y={TOP_Y}
                width={BUILDING_WIDTH}
                height={buildingHeight}
                fill="#fffaf7"
                stroke="#475569"
                strokeWidth="1.5"
              />

              {/* Floor rows (overlay on building) */}
              {orderedTopDown.map((floor, i) => {
                const y = TOP_Y + i * FLOOR_HEIGHT;
                const stats = statsByLocation?.get(floor.id);
                const heatLevel = getHeatLevel(stats, heatMaxes);
                return (
                  <FloorOverlayRow
                    key={floor.id}
                    floor={floor}
                    y={y}
                    stats={stats}
                    heatLevel={heatLevel}
                    selected={floor.id === selectedLocationId}
                    onSelect={onSelectLocation}
                  />
                );
              })}

              {/* Lobby */}
              <rect
                x={BUILDING_X}
                y={buildingBottomY}
                width={BUILDING_WIDTH}
                height={LOBBY_HEIGHT}
                fill="#f3eee6"
                stroke="#475569"
                strokeWidth="1.5"
              />
              <rect
                x={BUILDING_X + BUILDING_WIDTH / 2 - 28}
                y={buildingBottomY + 12}
                width={56}
                height={LOBBY_HEIGHT - 12}
                fill="#cbd5e1"
                stroke="#475569"
                strokeWidth="1"
              />
              <line
                x1={BUILDING_X + BUILDING_WIDTH / 2}
                y1={buildingBottomY + 12}
                x2={BUILDING_X + BUILDING_WIDTH / 2}
                y2={buildingBottomY + LOBBY_HEIGHT}
                stroke="#475569"
              />
              <text
                x={BUILDING_X + 12}
                y={buildingBottomY + LOBBY_HEIGHT / 2 + 4}
                fill="#475569"
                fontSize="11"
                fontWeight="700"
                fontFamily="ui-monospace, monospace"
              >
                LOBBY
              </text>
            </g>

            {/* Ground hatch */}
            <rect
              x={BUILDING_X - 10}
              y={lobbyBottomY}
              width={BUILDING_WIDTH + 20}
              height={GROUND_HEIGHT}
              fill="url(#bmGroundHatch)"
              opacity="0.55"
            />
            <line
              x1={BUILDING_X - 14}
              y1={lobbyBottomY}
              x2={BUILDING_X + BUILDING_WIDTH + 14}
              y2={lobbyBottomY}
              stroke="#1f1d1b"
              strokeWidth="1.5"
            />
          </svg>
        )}
      </div>
    </section>
  );
}

function FloorOverlayRow({ floor, y, stats, heatLevel, selected, onSelect }) {
  const fill = HEAT_FILL[heatLevel] ?? "#ffffff";
  const stroke = HEAT_STROKE[heatLevel] ?? "#e2e8f0";
  const lineCount = stats?.lineCount ?? 0;
  const unitTotal = stats?.unitTotal ?? 0;
  const tag = `L${floor.sort_order ?? "?"}`;
  const ariaLabel = `${floor.name}: ${lineCount} ${lineCount === 1 ? "line" : "lines"}, ${unitTotal} ${unitTotal === 1 ? "unit" : "units"}${selected ? " (selected)" : ""}`;

  return (
    <g
      onClick={() => onSelect?.(floor.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(floor.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      style={{ cursor: "pointer", outline: "none" }}
    >
      {/* Row background — heat tint */}
      <rect
        x={BUILDING_X}
        y={y}
        width={BUILDING_WIDTH}
        height={FLOOR_HEIGHT}
        fill={fill}
        stroke={stroke}
        strokeWidth="1"
      />

      {/* L# tag */}
      <rect
        x={BUILDING_X + 8}
        y={y + 6}
        width={36}
        height={FLOOR_HEIGHT - 12}
        rx="4"
        fill={selected ? "#ea580c" : "#0f172a"}
      />
      <text
        x={BUILDING_X + 26}
        y={y + FLOOR_HEIGHT / 2 + 3.5}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#ffffff"
        fontFamily="ui-monospace, monospace"
      >
        {tag}
      </text>

      {/* Floor name */}
      <text
        x={BUILDING_X + 56}
        y={y + FLOOR_HEIGHT / 2 + 4.5}
        fontSize="13"
        fontWeight="600"
        fill="#0f172a"
      >
        {floor.name}
      </text>

      {/* Stats */}
      <text
        x={BUILDING_X + BUILDING_WIDTH - 12}
        y={y + FLOOR_HEIGHT / 2 + 4}
        textAnchor="end"
        fontSize="11"
        fill={lineCount > 0 ? "#1f2937" : "#64748b"}
        fontFamily="ui-monospace, monospace"
      >
        {lineCount === 0
          ? "Empty"
          : `${fmt(lineCount)} \u00B7 ${fmt(unitTotal)}u`}
      </text>

      {/* Selected highlight */}
      {selected && (
        <rect
          x={BUILDING_X + 1.25}
          y={y + 1.25}
          width={BUILDING_WIDTH - 2.5}
          height={FLOOR_HEIGHT - 2.5}
          fill="none"
          stroke="#ea580c"
          strokeWidth="2.5"
          pointerEvents="none"
        />
      )}
    </g>
  );
}
