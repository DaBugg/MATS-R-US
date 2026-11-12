// Read the Neon SQL snapshot once. Demo edits stay in this browser.
const STORAGE_KEY = "mats-r-us-neon-demo-v1";
const TABLES = new Set(["locations", "suppliers", "materials", "inventory_items"]);
const listeners = new Set();
let statePromise;

async function getState() {
  if (!statePromise) {
    statePromise = (async () => {
      const response = await fetch("/api/bootstrap", { cache: "no-store" });
      if (!response.ok) throw new Error("Inventory service is unavailable. Try again shortly.");
      const seed = await response.json();
      if (![...TABLES].every((table) => Array.isArray(seed[table]))) {
        throw new Error("Inventory service returned incomplete data.");
      }
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if ([...TABLES].every((table) => Array.isArray(saved?.[table]))) return saved;
      } catch {
        // A corrupt or unavailable browser store should not hide the SQL seed.
      }
      return seed;
    })().catch((error) => {
      statePromise = undefined; // Let the visible retry button reconnect.
      throw error;
    });
  }
  return statePromise;
}

function save(state, table) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Storage can be disabled. */ }
  queueMicrotask(() => {
    for (const listener of listeners) if (listener.table === table) listener.callback();
  });
}

function enrich(row, state) {
  if (!row || !Object.hasOwn(row, "material_id")) return row;
  return {
    ...row,
    material: state.materials.find((item) => item.id === row.material_id) ?? null,
    location: state.locations.find((item) => item.id === row.location_id) ?? null,
    supplier: state.suppliers.find((item) => item.id === row.supplier_id) ?? null,
  };
}

class Query {
  constructor(table) {
    this.table = table;
    this.operation = "select";
    this.filters = [];
    this.sort = null;
    this.max = null;
    this.returning = false;
    this.head = false;
  }

  select(_columns = "*", options = {}) {
    this.returning = true;
    this.head = Boolean(options.head);
    return this;
  }
  insert(rows) { this.operation = "insert"; this.payload = rows; return this; }
  update(patch) { this.operation = "update"; this.payload = patch; return this; }
  delete() { this.operation = "delete"; return this; }
  eq(column, value) { this.filters.push((row) => String(row[column]) === String(value)); return this; }
  ilike(column, value) { this.filters.push((row) => String(row[column] ?? "").toLowerCase() === String(value).toLowerCase()); return this; }
  order(column, { ascending = true } = {}) { this.sort = { column, ascending }; return this; }
  limit(count) { this.max = count; return this; }
  single() { return this.run("single"); }
  maybeSingle() { return this.run("maybeSingle"); }
  then(resolve, reject) { return this.run().then(resolve, reject); }

  async run(mode = "many") {
    try {
      if (!TABLES.has(this.table)) throw new Error("Unknown data table.");
      const state = await getState();
      let rows = state[this.table].filter((row) => this.filters.every((filter) => filter(row)));
      if (this.operation === "select") {
        if (this.sort) {
          const { column, ascending } = this.sort;
          rows = [...rows].sort((a, b) => {
            const first = a[column] ?? "";
            const second = b[column] ?? "";
            const comparison = typeof first === "number" && typeof second === "number"
              ? first - second : String(first).localeCompare(String(second));
            return ascending ? comparison : -comparison;
          });
        }
        if (this.head) return { data: null, count: rows.length, error: null };
        if (this.max !== null) rows = rows.slice(0, this.max);
      } else if (this.operation === "insert") {
        const now = new Date().toISOString();
        rows = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((row) => ({
          id: crypto.randomUUID(), created_at: now, updated_at: now, is_active: true, ...row,
        }));
        state[this.table].push(...rows);
        save(state, this.table);
      } else {
        if (this.filters.length === 0) throw new Error("A row filter is required for this action.");
        if (this.operation === "update") {
          const now = new Date().toISOString();
          rows.forEach((row) => Object.assign(row, this.payload, { updated_at: now }));
          save(state, this.table);
        } else if (this.operation === "delete") {
          state[this.table] = state[this.table].filter((row) => !rows.includes(row));
          save(state, this.table);
        }
      }
      if (mode === "single" && rows.length !== 1) throw new Error("Expected one matching row.");
      if (mode === "maybeSingle" && rows.length > 1) throw new Error("Expected at most one matching row.");
      const data = !this.returning && this.operation !== "select" ? null
        : mode === "single" || mode === "maybeSingle" ? enrich(rows[0] ?? null, state)
          : rows.map((row) => enrich(row, state));
      return { data: data === null ? null : structuredClone(data), error: null };
    } catch (error) {
      return { data: null, count: null, error };
    }
  }
}

export const isSupabaseConfigured = true;
export const supabase = {
  from(table) { return new Query(table); },
  channel() {
    const subscriptions = [];
    return {
      on(_event, { table }, callback) { subscriptions.push({ table, callback }); return this; },
      subscribe() { subscriptions.forEach((item) => listeners.add(item)); return this; },
      unsubscribe() { subscriptions.forEach((item) => listeners.delete(item)); },
    };
  },
  removeChannel(channel) { channel.unsubscribe(); },
};
