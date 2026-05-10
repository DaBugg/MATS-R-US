// Heat-map utilities for the Locations page. Each location row is tinted
// from white (empty) to deep orange (relatively most loaded) so a glance at
// the floor list reveals where material is concentrated. Levels are
// normalized against the BUSIEST location in the current dataset, so the
// gradient stays meaningful regardless of project size.

export const HEAT_BUCKETS = [
  {
    level: 0,
    label: "None",
    rowBg: "bg-white",
    rowBorder: "border-slate-200",
    swatch: "bg-white border border-slate-300",
  },
  {
    level: 1,
    label: "Few",
    rowBg: "bg-orange-50",
    rowBorder: "border-orange-100",
    swatch: "bg-orange-50 border border-orange-200",
  },
  {
    level: 2,
    label: "Some",
    rowBg: "bg-orange-100",
    rowBorder: "border-orange-200",
    swatch: "bg-orange-100 border border-orange-300",
  },
  {
    level: 3,
    label: "Many",
    rowBg: "bg-orange-200",
    rowBorder: "border-orange-300",
    swatch: "bg-orange-200 border border-orange-400",
  },
  {
    level: 4,
    label: "Most",
    rowBg: "bg-orange-300",
    rowBorder: "border-orange-400",
    swatch: "bg-orange-300 border border-orange-500",
  },
];

// Compute the normalization maxes once on the parent so every row's heat
// level is consistent across the page.
export function computeHeatMaxes(statsByLocation) {
  let maxLines = 0;
  let maxUnits = 0;
  if (statsByLocation && typeof statsByLocation.forEach === "function") {
    statsByLocation.forEach((s) => {
      if (!s) return;
      if (s.lineCount > maxLines) maxLines = s.lineCount;
      if (s.unitTotal > maxUnits) maxUnits = s.unitTotal;
    });
  }
  return { maxLines, maxUnits };
}

// Returns an integer 0-4 representing where this location sits on the heat
// scale. Uses whichever dimension (lines or units) is more relatively full,
// so a floor heavy in either dimension lights up.
export function getHeatLevel(stats, maxes) {
  if (!stats || stats.lineCount === 0) return 0;
  const { maxLines = 0, maxUnits = 0 } = maxes ?? {};
  const linesRatio = maxLines > 0 ? stats.lineCount / maxLines : 0;
  const unitsRatio = maxUnits > 0 ? stats.unitTotal / maxUnits : 0;
  const ratio = Math.max(linesRatio, unitsRatio);
  if (ratio === 0) return 0;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  return 4;
}

export function getHeatBucket(level) {
  const idx = Math.max(0, Math.min(level | 0, HEAT_BUCKETS.length - 1));
  return HEAT_BUCKETS[idx];
}
