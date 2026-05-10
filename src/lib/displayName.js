// Convert lower-case material/notes copy ("red pex pipe") into a clean display
// label ("Red PEX Pipe") while preserving common construction acronyms.
//
// Per the reformat brief: do NOT silently change a material's category — only
// improve display formatting. If the source already has mixed/upper case
// (e.g. database-seeded names like "1 1/2 inch PVC Pipe"), leave it alone.

const ACRONYMS = new Set([
  "PEX",
  "PVC",
  "ABS",
  "EMT",
  "MC",
  "ROMEX",
  "GFCI",
  "HVAC",
  "CPVC",
  "OSB",
  "MDF",
  "PSI",
  "PSF",
  "ID",
  "OD",
  "NPT",
  "AWG",
]);

function titleCaseWord(word) {
  if (!word) return word;
  const upper = word.toUpperCase();
  if (ACRONYMS.has(upper)) return upper;
  // Preserve fractions and dimensions like "3/4" or "1/2".
  if (/^\d+\/\d+$/.test(word)) return word;
  // Preserve numeric tokens.
  if (/^\d+(\.\d+)?$/.test(word)) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function displayName(raw) {
  const s = (raw ?? "").trim();
  if (!s) return s;
  // If the input already contains uppercase letters that aren't all-caps,
  // assume it's a deliberately-cased name (e.g. "1 1/2 inch PVC Pipe") and
  // only normalize whitespace.
  const hasMixedCase = /[A-Z]/.test(s) && /[a-z]/.test(s);
  if (hasMixedCase) return s.replace(/\s+/g, " ");
  return s
    .split(/\s+/)
    .map(titleCaseWord)
    .join(" ");
}
