// Decorative tower elevation. Intentionally has NO text labels — the floor
// list lives in a separate, readable column so nothing overlaps. Used as a
// quiet visual on the side of the NorthTowerCard.

const FLOOR_HEIGHT = 28;
const FLOOR_WIDTH = 180;
const SVG_WIDTH = 220;

export default function TowerIllustration({ floorCount = 16 }) {
  const buildingHeight = Math.max(FLOOR_HEIGHT * floorCount, FLOOR_HEIGHT);
  const TOP_Y = 40;
  const buildingBottomY = TOP_Y + buildingHeight;
  const groundBottomY = buildingBottomY + 36;
  const svgHeight = groundBottomY + 14;
  const X = (SVG_WIDTH - FLOOR_WIDTH) / 2;

  return (
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`}
      className="block h-auto w-full select-none"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="towerGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#edf4f4" />
          <stop offset="100%" stopColor="#c6d4d3" />
        </linearGradient>
        <linearGradient id="towerFloor" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fffaf3" />
          <stop offset="100%" stopColor="#f4dac2" />
        </linearGradient>
        <pattern
          id="towerHatch"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke="#1f1d1b" strokeWidth="0.8" />
        </pattern>
      </defs>

      {/* Roof + crown */}
      <polygon
        points={`${X},${TOP_Y} ${X + 90},${TOP_Y - 22} ${X + FLOOR_WIDTH},${TOP_Y}`}
        fill="#25231f"
      />
      <rect x={X + 70} y={TOP_Y - 18} width="40" height="6" fill="#3a3730" />
      <rect x={X + 80} y={TOP_Y - 30} width="20" height="12" fill="#292722" />

      {/* Tower body */}
      <rect
        x={X}
        y={TOP_Y}
        width={FLOOR_WIDTH}
        height={buildingHeight}
        fill="#fffaf7"
        stroke="#bdb7ae"
        strokeWidth="1.2"
      />
      {/* Core column */}
      <rect
        x={X + FLOOR_WIDTH / 2 - 10}
        y={TOP_Y}
        width="20"
        height={buildingHeight}
        fill="#eee8df"
        stroke="#d0c8bf"
      />

      {/* Window stack */}
      {Array.from({ length: floorCount }).map((_, i) => {
        const y = TOP_Y + i * FLOOR_HEIGHT;
        return (
          <g key={i}>
            <line
              x1={X}
              y1={y}
              x2={X + FLOOR_WIDTH}
              y2={y}
              stroke="#d9d2ca"
              strokeWidth="0.8"
            />
            <rect
              x={X + 12}
              y={y + 6}
              width="50"
              height="16"
              fill="url(#towerGlass)"
              stroke="#8a8a82"
              strokeWidth="0.6"
            />
            <rect
              x={X + FLOOR_WIDTH - 62}
              y={y + 6}
              width="50"
              height="16"
              fill="url(#towerGlass)"
              stroke="#8a8a82"
              strokeWidth="0.6"
            />
          </g>
        );
      })}

      {/* Lobby */}
      <rect
        x={X}
        y={buildingBottomY}
        width={FLOOR_WIDTH}
        height={36}
        fill="#f3eee6"
        stroke="#bdb7ae"
        strokeWidth="1.2"
      />
      <rect
        x={X + FLOOR_WIDTH / 2 - 22}
        y={buildingBottomY + 8}
        width="44"
        height="22"
        fill="url(#towerGlass)"
        stroke="#6f7979"
        strokeWidth="0.8"
      />
      <rect
        x={X + FLOOR_WIDTH / 2 - 1}
        y={buildingBottomY + 8}
        width="2"
        height="22"
        fill="#3a403f"
      />

      {/* Ground hatch */}
      <rect
        x={X - 12}
        y={groundBottomY - 4}
        width={FLOOR_WIDTH + 24}
        height="10"
        fill="url(#towerHatch)"
        opacity="0.78"
      />
      <line
        x1={X - 18}
        y1={groundBottomY - 4}
        x2={X + FLOOR_WIDTH + 18}
        y2={groundBottomY - 4}
        stroke="#1f1d1b"
        strokeWidth="1.2"
      />
    </svg>
  );
}
