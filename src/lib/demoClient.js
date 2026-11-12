// Shared Neon reads; all writes go through protected server endpoints.
const TABLES = new Set(["locations", "suppliers", "materials", "inventory_items"]);
const listeners = new Set();
let statePromise;
let fetchedAt = 0;
let pollTimer;

async function getState(force = false) {
  if (force || Date.now() - fetchedAt > 3000) statePromise = undefined;
  if (!statePromise) {
    statePromise = fetch("/api/bootstrap", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Inventory service is unavailable. Try again shortly.");
      const state = await response.json();
      if (![...TABLES].every((table) => Array.isArray(state[table]))) throw new Error("Inventory service returned incomplete data.");
      fetchedAt = Date.now();
      return state;
    }).catch((error) => { statePromise = undefined; throw error; });
  }
  return statePromise;
}

function changed() {
  statePromise = undefined;
  fetchedAt = 0;
  queueMicrotask(() => listeners.forEach(({ callback }) => callback()));
}

export async function sharedWrite(path, payload) {
  let key = sessionStorage.getItem("mats-editor-key");
  if (!key) {
    key = window.prompt("Enter the Mats-R-Us editor key to save changes:")?.trim();
    if (!key) throw new Error("An editor key is required to change inventory.");
    sessionStorage.setItem("mats-editor-key", key);
  }
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) sessionStorage.removeItem("mats-editor-key");
    throw new Error(result.error || "Save failed (" + response.status + ").");
  }
  changed();
  return result;
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
  constructor(table) { this.table = table; this.filters = []; this.sort = null; this.max = null; this.head = false; }
  select(_columns = "*", options = {}) { this.head = Boolean(options.head); return this; }
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
      if (this.sort) {
        const { column, ascending } = this.sort;
        rows = [...rows].sort((a, b) => {
          const first = a[column] ?? ""; const second = b[column] ?? "";
          const comparison = typeof first === "number" && typeof second === "number"
            ? first - second : String(first).localeCompare(String(second));
          return ascending ? comparison : -comparison;
        });
      }
      const count = rows.length;
      if (this.head) return { data: null, count, error: null };
      if (this.max !== null) rows = rows.slice(0, this.max);
      if (mode === "single" && rows.length !== 1) throw new Error("Expected one matching row.");
      if (mode === "maybeSingle" && rows.length > 1) throw new Error("Expected at most one matching row.");
      const data = mode === "single" || mode === "maybeSingle" ? enrich(rows[0] ?? null, state) : rows.map((row) => enrich(row, state));
      return { data: data === null ? null : structuredClone(data), count, error: null };
    } catch (error) { return { data: null, count: null, error }; }
  }
}

export const isSupabaseConfigured = true;
export const supabase = {
  from(table) { return new Query(table); },
  channel() {
    const subscriptions = [];
    return {
      on(_event, { table }, callback) { subscriptions.push({ table, callback }); return this; },
      subscribe() {
        subscriptions.forEach((item) => listeners.add(item));
        if (!pollTimer) pollTimer = setInterval(async () => {
          if (document.hidden) return;
          try { await getState(true); listeners.forEach(({ callback }) => callback()); } catch { /* Views show retry errors. */ }
        }, 10000);
        return this;
      },
      unsubscribe() {
        subscriptions.forEach((item) => listeners.delete(item));
        if (!listeners.size && pollTimer) { clearInterval(pollTimer); pollTimer = undefined; }
      },
    };
  },
  removeChannel(channel) { channel.unsubscribe(); },
};
