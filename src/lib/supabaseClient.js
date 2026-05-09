import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Accept either the modern publishable key (sb_publishable_...) or the legacy
// anon JWT — Supabase supports both as the public client-side key.
const supabasePublicKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublicKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL and/or VITE_SUPABASE_PUBLISHABLE_KEY " +
      "(or VITE_SUPABASE_ANON_KEY). Create a .env.local file (see .env.example) " +
      "and restart the dev server.",
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublicKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;
