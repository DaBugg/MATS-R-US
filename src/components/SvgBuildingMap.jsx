import { useMemo } from "react";

// Geometry constants — match the original North Tower SVG so the look is preserved.
const FLOOR_HEIGHT = 64;
const BUILDING_TOP_Y = 185;
const BUILDING_X = 110;
const BUILDING_WIDTH = 560;
const GROUND_HEIGHT = 116;
const FOOTER_GAP = 70;
const FOOTER_HEIGHT = 200;

// Connex box geometry (right of the building).
const CONNEX_X = 725;
const CONNEX_WIDTH = 220;
const CONNEX_HEIGHT = 116;

const SVG_WIDTH = 1000;

// Format a quantity for the stat readout — integer-friendly, locale-aware.
function fmt(n) {
  if (!Number.isFinite(n)) return "0";
  if (Number.isInteger(n)) return new Intl.NumberFormat("en-US").format(n);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(n);
}

function pluralize(n, one, many) {
  return `${fmt(n)} ${n === 1 ? one : many}`;
}

export default function SvgBuildingMap({
  locations,
  statsByLocation,
  selectedLocationId,
  onSelectLocation,
  loading,
  buildingName = "NORTH TOWER",
}) {
  const { floors, storage } = useMemo(() => {
    const floorsAsc = locations
      .filter((l) => l.type === "floor")
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const storageList = locations.filter((l) => l.type !== "floor");
    return {
      floors: [...floorsAsc].reverse(), // top floor first when rendered top-to-bottom
      storage: storageList,
    };
  }, [locations]);

  const buildingHeight = Math.max(floors.length * FLOOR_HEIGHT, FLOOR_HEIGHT);
  const buildingBottomY = BUILDING_TOP_Y + buildingHeight;
  const groundBottomY = buildingBottomY + GROUND_HEIGHT;
  const svgHeight = groundBottomY + FOOTER_GAP + FOOTER_HEIGHT;

  const totals = useMemo(() => {
    let lines = 0;
    let units = 0;
    let connexLines = 0;
    let connexUnits = 0;
    for (const loc of locations) {
      const s = statsByLocation?.get(loc.id);
      if (!s) continue;
      lines += s.lineCount;
      units += s.unitTotal;
      if (loc.type !== "floor") {
        connexLines += s.lineCount;
        connexUnits += s.unitTotal;
      }
    }
    return { lines, units, connexLines, connexUnits };
  }, [locations, statsByLocation]);

  const primaryConnex = storage[0] ?? null;

  if (!loading && floors.length === 0 && storage.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-medium text-slate-700">
          No active locations
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Add a floor or storage row in your Supabase{" "}
          <code className="rounded bg-slate-100 px-1">locations</code> table.
        </p>
      </div>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`}
      role="img"
      aria-labelledby="snl-building-title snl-building-desc"
      className="block h-auto w-full select-none"
    >
      <title id="snl-building-title">{buildingName} inventory map</title>
      <desc id="snl-building-desc">
        Architectural elevation of {buildingName} with{" "}
        {pluralize(floors.length, "floor", "floors")}
        {primaryConnex ? " and a Connex storage container" : ""}. Click a floor
        or the Connex to view its inventory.
      </desc>

      <defs>
        <linearGradient id="busyFloor" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff8f2" />
          <stop offset="100%" stopColor="#f4b493" />
        </linearGradient>

        <linearGradient id="connexOrange" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f4a36f" />
          <stop offset="100%" stopColor="#e28552" />
        </linearGradient>

        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#edf4f4" />
          <stop offset="100%" stopColor="#c6d4d3" />
        </linearGradient>

        <pattern
          id="groundHatch"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="7" stroke="#1f1d1b" strokeWidth="1" />
        </pattern>

        <filter
          id="softShadow"
          x="-20%"
          y="-20%"
          width="140%"
          height="160%"
        >
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="10"
            floodColor="#000000"
            floodOpacity="0.12"
          />
        </filter>

        <symbol id="window-double" viewBox="0 0 70 40">
          <rect
            x="0.5"
            y="0.5"
            width="69"
            height="39"
            fill="url(#glass)"
            stroke="#8a8a82"
            strokeWidth="1"
          />
          <line x1="35" y1="1" x2="35" y2="39" stroke="#8a8a82" strokeWidth="1" />
          <line x1="0" y1="30" x2="70" y2="30" stroke="#77776f" strokeWidth="1" />
          <rect x="4" y="5" width="27" height="22" fill="#ffffff" opacity="0.22" />
          <rect x="39" y="5" width="24" height="22" fill="#ffffff" opacity="0.16" />
          <rect x="-2" y="39" width="74" height="4" fill="#9b9b92" opacity="0.7" />
        </symbol>

        <symbol id="core-slit-window" viewBox="0 0 28 40">
          <rect
            x="1"
            y="1"
            width="26"
            height="38"
            fill="#f2f0eb"
            stroke="#aaa39a"
            strokeWidth="1"
          />
          {[8, 12, 16, 20, 24, 28].map((y) => (
            <line
              key={y}
              x1="5"
              y1={y}
              x2="23"
              y2={y}
              stroke="#4a4a43"
              strokeWidth="1"
            />
          ))}
        </symbol>

        <style>{`
          .bg { fill: #f7f5f1; }
          .title-text { font: 800 42px Inter, Arial, sans-serif; letter-spacing: 0.14em; fill: #1f1d1b; }
          .subtitle-text { font: 400 26px "Courier New", monospace; letter-spacing: 0.06em; fill: #726d68; }
          .floor-label { font: 700 17px Inter, Arial, sans-serif; fill: #1f1d1b; }
          .stat-text { font: 400 16px "Courier New", monospace; fill: #4f4a45; }
          .badge-text { font: 700 11px "Courier New", monospace; fill: #ffffff; }
          .small-mono { font: 400 15px "Courier New", monospace; fill: #3f3934; }
          .legend-text { font: 400 24px "Courier New", monospace; fill: #7b756f; }
          .summary-text { font: 400 31px "Courier New", monospace; fill: #706b65; }
          .summary-strong { font: 800 31px Inter, Arial, sans-serif; fill: #1f1d1b; }
          .summary-orange { font: 800 31px Inter, Arial, sans-serif; fill: #e76522; }
          .floor-row { cursor: pointer; }
          .floor-row:hover .floor-bg { opacity: 1; }
          .floor-row.is-empty .floor-bg { opacity: 0.76; }
          .floor-row.is-empty:hover .floor-bg { opacity: 0.92; }
          .floor-outline { fill: none; pointer-events: none; }
          .floor-row.is-selected .floor-outline { stroke: #e76522; stroke-width: 2; }
          .connex-group { cursor: pointer; }
          .connex-group:hover .connex-shell { filter: brightness(1.04); }
          .connex-outline { fill: none; pointer-events: none; }
          .connex-group.is-selected .connex-outline { stroke: #1f1d1b; stroke-width: 3; }
        `}</style>
      </defs>

      <rect className="bg" width={SVG_WIDTH} height={svgHeight} />

      <text x="38" y="66" className="title-text">
        {buildingName}
      </text>
      <text x="40" y="104" className="subtitle-text">
        {pluralize(floors.length, "FLOOR", "FLOORS").toUpperCase()}
      </text>

      <g id="north-tower-building" filter="url(#softShadow)">
        <polygon
          points={`${BUILDING_X},185 ${BUILDING_X + 280},105 ${BUILDING_X + BUILDING_WIDTH},185`}
          fill="#25231f"
        />
        <polygon
          points={`${BUILDING_X + 135},148 ${BUILDING_X + 425},148 ${BUILDING_X + 490},185 ${BUILDING_X + 70},185`}
          fill="#2f2d28"
        />
        <rect x={BUILDING_X + 210} y="118" width="140" height="28" fill="#292722" />
        <rect x={BUILDING_X + 255} y="129" width="58" height="16" fill="#3a3730" />
        <line
          x1={BUILDING_X}
          y1="185"
          x2={BUILDING_X + BUILDING_WIDTH}
          y2="185"
          stroke="#171514"
          strokeWidth="2"
        />

        <rect
          x={BUILDING_X}
          y={BUILDING_TOP_Y}
          width={BUILDING_WIDTH}
          height={buildingHeight}
          fill="#fffaf7"
          stroke="#bdb7ae"
          strokeWidth="1.5"
        />

        <rect
          x={BUILDING_X}
          y={BUILDING_TOP_Y}
          width="250"
          height={buildingHeight}
          fill="#ffffff"
          opacity="0.18"
        />
        <rect
          x={BUILDING_X + 268}
          y={BUILDING_TOP_Y}
          width="54"
          height={buildingHeight}
          fill="#eee8df"
          stroke="#d0c8bf"
          strokeWidth="1"
        />
        <line
          x1={BUILDING_X + 268}
          y1={BUILDING_TOP_Y}
          x2={BUILDING_X + 268}
          y2={buildingBottomY}
          stroke="#c9c0b7"
        />
        <line
          x1={BUILDING_X + 322}
          y1={BUILDING_TOP_Y}
          x2={BUILDING_X + 322}
          y2={buildingBottomY}
          stroke="#c9c0b7"
        />

        {floors.map((floor, i) => {
          const y = BUILDING_TOP_Y + i * FLOOR_HEIGHT;
          const stats = statsByLocation?.get(floor.id) ?? {
            lineCount: 0,
            unitTotal: 0,
          };
          return (
            <FloorRow
              key={floor.id}
              floor={floor}
              y={y}
              stats={stats}
              selected={floor.id === selectedLocationId}
              onSelect={onSelectLocation}
            />
          );
        })}

        <Lobby
          x={BUILDING_X}
          y={buildingBottomY}
          width={BUILDING_WIDTH}
          height={GROUND_HEIGHT}
        />

        <rect
          x={BUILDING_X - 20}
          y={groundBottomY - 4}
          width={BUILDING_WIDTH + 40}
          height="28"
          fill="url(#groundHatch)"
          opacity="0.78"
        />
        <line
          x1={BUILDING_X - 50}
          y1={groundBottomY - 4}
          x2={BUILDING_X + BUILDING_WIDTH + 40}
          y2={groundBottomY - 4}
          stroke="#1f1d1b"
          strokeWidth="2"
        />
      </g>

      {primaryConnex && (
        <ConnexBox
          location={primaryConnex}
          baseY={buildingBottomY - 3}
          stats={
            statsByLocation?.get(primaryConnex.id) ?? {
              lineCount: 0,
              unitTotal: 0,
            }
          }
          selected={primaryConnex.id === selectedLocationId}
          onSelect={onSelectLocation}
        />
      )}

      <Footer
        y={groundBottomY + FOOTER_GAP}
        totals={totals}
        floorCount={floors.length}
      />
    </svg>
  );
}

function FloorRow({ floor, y, stats, selected, onSelect }) {
  const isBusy = stats.lineCount > 0;
  const accentColor = colorFor(floor.id);
  const widthLeft = Math.min(160, 60 + stats.lineCount * 18);
  const widthRight = Math.min(230, 80 + stats.unitTotal / 6);

  return (
    <g
      className={[
        "floor-row",
        isBusy ? "is-busy" : "is-empty",
        selected ? "is-selected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onSelect?.(floor.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(floor.id);
        }
      }}
      aria-label={`${floor.name}: ${pluralize(stats.lineCount, "line", "lines")}, ${pluralize(stats.unitTotal, "unit", "units")}${selected ? " (selected)" : ""}`}
    >
      <rect
        className="floor-bg"
        x={BUILDING_X}
        y={y}
        width={BUILDING_WIDTH}
        height={FLOOR_HEIGHT}
        fill={isBusy ? "url(#busyFloor)" : "#fffaf7"}
      />
      <line
        x1={BUILDING_X}
        y1={y}
        x2={BUILDING_X + BUILDING_WIDTH}
        y2={y}
        stroke="#d9d2ca"
        strokeWidth="1"
      />

      <rect x={BUILDING_X + 22} y={y + 18} width="36" height="22" rx="4" fill="#151412" />
      <text
        x={BUILDING_X + 40}
        y={y + 33}
        textAnchor="middle"
        className="badge-text"
      >
        L{floor.sort_order ?? ""}
      </text>
      <text x={BUILDING_X + 72} y={y + 35} className="floor-label">
        {floor.name}
      </text>

      <use href="#window-double" x={BUILDING_X + 178} y={y + 19} />
      <use href="#window-double" x={BUILDING_X + 360} y={y + 19} />
      <use href="#core-slit-window" x={BUILDING_X + 285} y={y + 18} />

      <text x={BUILDING_X + 416} y={y + 35} className="stat-text">
        {pluralize(stats.lineCount, "line", "lines")} ·{" "}
        {pluralize(stats.unitTotal, "unit", "units")}
      </text>

      {isBusy && (
        <>
          <rect
            x={BUILDING_X + 318}
            y={y + 59}
            width={widthRight}
            height="3"
            rx="1.5"
            fill={accentColor}
          />
          <rect
            x={BUILDING_X + 90}
            y={y + 59}
            width={widthLeft}
            height="3"
            rx="1.5"
            fill={accentColor}
            opacity="0.75"
          />
        </>
      )}

      <rect
        className="floor-outline"
        x={BUILDING_X}
        y={y}
        width={BUILDING_WIDTH}
        height={FLOOR_HEIGHT}
      />
    </g>
  );
}

function Lobby({ x, y, width, height }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#f3eee6"
        stroke="#bdb7ae"
        strokeWidth="1.5"
      />
      {[70, 140, 210, 350, 420, 490].map((dx) => (
        <line
          key={dx}
          x1={x + dx}
          y1={y}
          x2={x + dx}
          y2={y + height}
          stroke="#ddd5cc"
        />
      ))}
      <rect
        x={x + 220}
        y={y + 18}
        width="130"
        height="24"
        fill="#cfb79e"
        stroke="#927766"
        strokeWidth="1"
      />
      <rect
        x={x + 236}
        y={y + 42}
        width="98"
        height="66"
        fill="#e9e1d8"
        stroke="#91867c"
        strokeWidth="1.5"
      />
      <rect
        x={x + 250}
        y={y + 51}
        width="35"
        height="54"
        fill="url(#glass)"
        stroke="#6f7979"
      />
      <rect
        x={x + 287}
        y={y + 51}
        width="35"
        height="54"
        fill="url(#glass)"
        stroke="#6f7979"
      />
      <line
        x1={x + 286}
        y1={y + 51}
        x2={x + 286}
        y2={y + 105}
        stroke="#4d5555"
      />
      <circle cx={x + 282} cy={y + 80} r="2" fill="#3a403f" />
      <circle cx={x + 291} cy={y + 80} r="2" fill="#3a403f" />
      <rect
        x={x + 206}
        y={y + 58}
        width="8"
        height="18"
        rx="2"
        fill="#3a332d"
      />
      <rect
        x={x + 356}
        y={y + 58}
        width="8"
        height="18"
        rx="2"
        fill="#3a332d"
      />

      <g opacity="0.9">
        <ellipse cx={x + 28} cy={y + 104} rx="23" ry="15" fill="#5c7347" />
        <ellipse cx={x + 88} cy={y + 92} rx="24" ry="20" fill="#6c7e50" />
        <ellipse cx={x + 126} cy={y + 102} rx="20" ry="15" fill="#62774a" />
        <ellipse cx={x + 168} cy={y + 101} rx="24" ry="14" fill="#5f7349" />
        <ellipse cx={x + 405} cy={y + 102} rx="24" ry="15" fill="#5d7048" />
        <ellipse cx={x + 456} cy={y + 103} rx="25" ry="14" fill="#687a4d" />
        <ellipse cx={x + 505} cy={y + 94} rx="24" ry="19" fill="#617348" />
        <ellipse cx={x + 546} cy={y + 104} rx="23" ry="13" fill="#65794c" />
        <polygon
          points={`${x + 60},${y + 106} ${x + 72},${y + 56} ${x + 86},${y + 106}`}
          fill="#5e7448"
        />
        <polygon
          points={`${x + 520},${y + 106} ${x + 535},${y + 55} ${x + 551},${y + 106}`}
          fill="#5e7448"
        />
      </g>
    </g>
  );
}

function ConnexBox({ location, baseY, stats, selected, onSelect }) {
  const x = CONNEX_X;
  const y = baseY - CONNEX_HEIGHT;
  const w = CONNEX_WIDTH;
  const h = CONNEX_HEIGHT;
  const ribStartX = x + 23;
  const ribCount = 12;
  const ribSpacing = 15;

  return (
    <g
      className={["connex-group", selected ? "is-selected" : ""].filter(Boolean).join(" ")}
      filter="url(#softShadow)"
      onClick={() => onSelect?.(location.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(location.id);
        }
      }}
      aria-label={`${location.name}: ${pluralize(stats.lineCount, "line", "lines")}, ${pluralize(stats.unitTotal, "unit", "units")}${selected ? " (selected)" : ""}`}
    >
      <ellipse cx={x + w / 2} cy={y + h + 14} rx="142" ry="11" fill="#000000" opacity="0.12" />
      <rect
        className="connex-shell"
        x={x}
        y={y}
        width={w}
        height={h}
        fill="url(#connexOrange)"
        stroke="#7a442d"
        strokeWidth="2"
      />
      <rect x={x} y={y} width={w} height="8" fill="#d97845" />
      <rect x={x} y={y + h - 8} width={w} height="8" fill="#c96c3d" />

      {[
        [x - 5, y - 5],
        [x + w - 2, y - 5],
        [x - 5, y + h - 4],
        [x + w - 2, y + h - 4],
      ].map(([cx, cy]) => (
        <rect
          key={`${cx}-${cy}`}
          x={cx}
          y={cy}
          width="8"
          height="8"
          fill="#e28652"
          stroke="#6f3c28"
          strokeWidth="2"
        />
      ))}

      {Array.from({ length: ribCount }).map((_, i) => {
        const rx = ribStartX + i * ribSpacing;
        return (
          <line
            key={rx}
            x1={rx}
            y1={y + 12}
            x2={rx}
            y2={y + h - 10}
            stroke="#ab5e3d"
            strokeWidth="1"
          />
        );
      })}

      <line
        x1={x + 125}
        y1={y + 8}
        x2={x + 125}
        y2={y + h - 8}
        stroke="#8a4b31"
        strokeWidth="1.5"
      />
      <line
        x1={x + 128}
        y1={y + 58}
        x2={x + 139}
        y2={y + 58}
        stroke="#423025"
        strokeWidth="2"
      />
      <line
        x1={x + 135}
        y1={y + 51}
        x2={x + 135}
        y2={y + 72}
        stroke="#423025"
        strokeWidth="2"
      />
      <circle cx={x + 133} cy={y + 62} r="2.5" fill="#2f241e" />

      <rect
        x={x + 17}
        y={y + 13}
        width="85"
        height="22"
        rx="3"
        fill="#171514"
      />
      <text
        x={x + 59.5}
        y={y + 29}
        textAnchor="middle"
        className="badge-text"
        fontSize="12"
      >
        {(location.name ?? "CONNEX").toUpperCase().slice(0, 10)}
      </text>

      <text x={x + 156} y={y + 91} textAnchor="middle" className="small-mono">
        {fmt(stats.lineCount)} · {fmt(stats.unitTotal)}
      </text>

      <rect x={x + 50} y={y + h + 0} width="24" height="6" fill="#45362c" />
      <rect x={x + 152} y={y + h + 0} width="24" height="6" fill="#45362c" />

      <rect
        className="connex-outline"
        x={x - 4}
        y={y - 4}
        width={w + 8}
        height={h + 8}
        rx="6"
      />
    </g>
  );
}

function Footer({ y, totals, floorCount }) {
  return (
    <g>
      <line x1="40" y1={y} x2={SVG_WIDTH - 40} y2={y} stroke="#d8d1ca" strokeWidth="1.5" />

      <rect
        x="48"
        y={y + 52}
        width="31"
        height="31"
        rx="3"
        fill="none"
        stroke="#aaa49d"
        strokeWidth="2"
      />
      <text x="105" y={y + 76} className="legend-text">
        empty
      </text>

      <rect
        x="220"
        y={y + 61}
        width="590"
        height="14"
        rx="7"
        fill="url(#busyFloor)"
      />
      <text x="855" y={y + 76} className="legend-text">
        busy
      </text>
      <rect
        x="930"
        y={y + 52}
        width="31"
        height="31"
        rx="4"
        fill="#f4a36f"
        stroke="#d18359"
      />

      <text x="48" y={y + 140} className="summary-strong">
        {fmt(totals.lines)}
      </text>
      <text x="120" y={y + 140} className="summary-text">
        {totals.lines === 1 ? "line" : "lines"} ·
      </text>
      <text x="270" y={y + 140} className="summary-strong">
        {fmt(totals.units)}
      </text>
      <text x="400" y={y + 140} className="summary-text">
        units on site
      </text>
      {totals.connexLines > 0 && (
        <>
          <text x="660" y={y + 140} className="summary-text">
            ·
          </text>
          <text x="685" y={y + 140} className="summary-orange">
            {fmt(totals.connexLines)}
          </text>
          <text x="735" y={y + 140} className="summary-text">
            in connex
          </text>
        </>
      )}
      <text x="48" y={y + 178} className="legend-text">
        {floorCount} active {floorCount === 1 ? "floor" : "floors"} — click any
        floor or the connex to view inventory.
      </text>
    </g>
  );
}

// Deterministic accent color for each location's busy bar (rotates through
// a palette so adjacent floors don't always look identical).
const ACCENT_COLORS = ["#42a36d", "#2ea9cf", "#e76522", "#a36cd6"];
function colorFor(id) {
  if (!id) return ACCENT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length];
}
